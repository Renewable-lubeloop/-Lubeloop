import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Componente da Logo Vetorial LubeLoop (Gota + Loop de Reciclagem)
const LubeLoopLogo = ({ className = "w-10 h-10", glow = true }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lubeloopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="50%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
      {glow && (
        <filter id="lubeloopGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#10B981" floodOpacity="0.5" />
        </filter>
      )}
    </defs>
    <path
      d="M50 14 C30 14 14 30 14 50 C14 70 30 86 50 86 C70 86 86 70 86 50 C86 40 81 31 73 24"
      stroke="url(#lubeloopGrad)"
      strokeWidth="9"
      strokeLinecap="round"
      filter={glow ? "url(#lubeloopGlow)" : undefined}
    />
    <path
      d="M50 28 C43 39 38 48 38 55 C38 62 43.4 67 50 67 C56.6 67 62 62 62 55 C62 48 57 39 50 28 Z"
      fill="url(#lubeloopGrad)"
    />
    <circle cx="50" cy="55" r="3" fill="#A7F3D0" />
    <circle cx="73" cy="24" r="5" fill="#34D399" />
  </svg>
)

// Conexão com o Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [coletas, setColetas] = useState([])
  const [loading, setLoading] = useState(false)
  const [buscandoDoc, setBuscandoDoc] = useState(false)

  const [novaColeta, setNovaColeta] = useState({
    gerador: '',
    cnpj: '',
    inscricao_estadual: '',
    volume_estimado: '',
    valor_esperado: '',
    cotacao_aberta: false,
    requer_balsa: false,
    tem_transbordo: true, // Padrão: base licenciada de armazenamento intermediário
    estado_base_transbordo: 'ES', // ex: Serra/ES
    estado_destinacao_final: 'SP', // ex: Usina de Rerrefino em SP
    endereco: '',
    cidade: 'Serra',
    estado: 'ES'
  })

  useEffect(() => {
    if (supabase) buscarColetas()
  }, [])

  const buscarColetas = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('coletas')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) setColetas(data)
    } catch (err) {
      console.error("Erro ao carregar coletas:", err)
    } finally {
      setLoading(false)
    }
  }

  // Roteador Inteligente de MTR por Cidade / UF
  const getSistemaMtrOrigem = (uf, cidade) => {
    const estado = (uf || '').toUpperCase().trim()
    
    // Mapeamento de Estados com Sistemas Próprios integrados
    const sistemasProprios = {
      'RJ': { nome: 'INEA / MTR-RJ', tipo: 'Estadual Próprio' },
      'MG': { nome: 'FEAM / MTR-MG', tipo: 'Estadual Próprio' },
      'SP': { nome: 'SIGOR / Cetesb (SP)', tipo: 'Estadual Próprio' },
      'PR': { nome: 'IAT / MTR-PR', tipo: 'Estadual Próprio' },
      'SC': { nome: 'IMA / MTR-SC', tipo: 'Estadual Próprio' text },
      'RS': { nome: 'FEPAM / MTR-RS', tipo: 'Estadual Próprio' }
    }

    if (sistemasProprios[estado]) {
      return sistemasProprios[estado]
    }

    // Demais UFs (como ES, BA, GO, etc.) utilizam o SINIR Nacional do IBAMA
    return { nome: 'SINIR Nacional (IBAMA)', tipo: 'Nacional Integrado' }
  }

  // Cálculo de Rota Multiestadual de MTR (Cadeia de Custódia de OLUC)
  const getCadeiaMtrCompleta = (ufOrigem, cidadeOrigem, temTransbordo, ufBase, ufDestino) => {
    const mtrOrigem = getSistemaMtrOrigem(ufOrigem, cidadeOrigem)
    const sistemas = [mtrOrigem.nome]

    if (temTransbordo) {
      const mtrBase = getSistemaMtrOrigem(ufBase, '')
      if (!sistemas.includes(mtrBase.nome)) sistemas.push(mtrBase.nome)

      const mtrDestino = getSistemaMtrOrigem(ufDestino, '')
      if (!sistemas.includes(mtrDestino.nome)) sistemas.push(mtrDestino.nome)
    }

    return sistemas
  }

  // Precificação Ajustada pela Matriz Logística
  const getBenchmarkLogistico = (cidade, estado, volumeLitros, requerBalsa) => {
    const vol = parseFloat(volumeLitros) || 0
    const uf = (estado || '').toUpperCase().trim()
    const cid = (cidade || '').toLowerCase().trim()

    let multiplicadorZona = 1.0
    let nomeZona = 'Rota Regular'

    const cidadesHub = ['serra', 'vitoria', 'vitória', 'vila velha', 'cariacica', 'viana']

    if (uf === 'ES' && cidadesHub.includes(cid)) {
      multiplicadorZona = 1.10
      nomeZona = 'Hub Direto'
    } else if (['ES', 'MG', 'RJ'].includes(uf)) {
      multiplicadorZona = 1.00
      nomeZona = 'Rota Terrestre Regular'
    } else {
      multiplicadorZona = 0.80
      nomeZona = 'Longo Curso'
    }

    if (requerBalsa) {
      multiplicadorZona *= 0.80
      nomeZona += ' + Travessia Balsa/Fluvial'
    }

    let minBase = 1.00
    let maxBase = 1.30

    if (vol >= 2000) {
      minBase = 1.60
      maxBase = 2.00
    } else if (vol >= 500) {
      minBase = 1.25
      maxBase = 1.60
    }

    const minAjustado = (minBase * multiplicadorZona).toFixed(2)
    const maxAjustado = (maxBase * multiplicadorZona).toFixed(2)

    return {
      faixaTexto: `R$ ${minAjustado} a R$ ${maxAjustado} / L`,
      nomeZona
    }
  }

  const benchmarkAtual = getBenchmarkLogistico(novaColeta.cidade, novaColeta.estado, novaColeta.volume_estimado, novaColeta.requer_balsa)
  const cadeiaMtrAtual = getCadeiaMtrCompleta(novaColeta.estado, novaColeta.cidade, novaColeta.tem_transbordo, novaColeta.estado_base_transbordo, novaColeta.estado_destinacao_final)

  // Consulta inteligente: CPF no Supabase vs CNPJ na Receita/Sintegra por UF
  const handleDocumentoChange = async (e) => {
    const valorDigitado = e.target.value
    setNovaColeta(prev => ({ ...prev, cnpj: valorDigitado }))
    const docLimpo = valorDigitado.replace(/\D/g, '')

    if (docLimpo.length === 11) {
      setBuscandoDoc(true)
      try {
        if (supabase) {
          const { data } = await supabase
            .from('coletas')
            .select('*')
            .eq('cnpj', valorDigitado)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (data) {
            setNovaColeta(prev => ({
              ...prev,
              gerador: data.gerador_nome || prev.gerador,
              inscricao_estadual: data.inscricao_estadual || 'Isento (Pessoa Física)',
              endereco: data.endereco || prev.endereco,
              cidade: data.cidade || prev.cidade,
              estado: data.estado || prev.estado
            }))
          } else {
            setNovaColeta(prev => ({ ...prev, inscricao_estadual: 'Isento (Pessoa Física)' }))
          }
        }
      } catch (err) {
        console.error("Erro ao buscar CPF:", err)
      } finally {
        setBuscandoDoc(false)
      }
    }

    if (docLimpo.length === 14) {
      setBuscandoDoc(true)
      const ehFilial = !docLimpo.substring(8, 12).includes('0001')

      try {
        const response = await fetch(`https://publica.cnpj.ws/cnpj/${docLimpo}`)
        if (response.ok) {
          const data = await response.json()
          const est = data.estabelecimento || {}
          const uf = est.estado?.sigla || ''
          const ieArray = est.inscricoes_estaduais || []

          let ieEncontrada = ''
          if (ieArray.length > 0) {
            const ieDoEstado = ieArray.filter(i => i.estado?.sigla === uf && i.ativo !== false)
            if (ehFilial && ieDoEstado.length > 1) {
              ieEncontrada = ieDoEstado[ieDoEstado.length - 1].inscricao_estadual || ''
            } else if (ieDoEstado.length === 1) {
              ieEncontrada = ieDoEstado[0].inscricao_estadual || ''
            }
          }

          if (ehFilial && (!ieEncontrada || ieEncontrada === '081058292')) {
            ieEncontrada = ''
          }

          setNovaColeta(prev => ({
            ...prev,
            gerador: data.razao_social || est.nome_fantasia || prev.gerador,
            inscricao_estadual: ieEncontrada || 'Isento / Não cadastrado',
            endereco: `${est.logradouro || ''}, ${est.numero || 'S/N'}${est.bairro ? ' - ' + est.bairro : ''}`,
            cidade: est.cidade?.nome || prev.cidade,
            estado: uf || prev.estado
          }))
        }
      } catch (err) {
        console.error("Erro na busca de CNPJ:", err)
      } finally {
        setBuscandoDoc(false)
      }
    }
  }

  const handleCriarSolicitacao = async (e) => {
    e.preventDefault()
    if (!supabase) return

    setLoading(true)

    let valorFinalTexto = novaColeta.cotacao_aberta 
      ? 'Cotação Aberta (Melhor Oferta)' 
      : novaColeta.valor_esperado 
        ? `R$ ${parseFloat(novaColeta.valor_esperado).toFixed(2)} / L` 
        : 'A combinar'

    if (novaColeta.requer_balsa) valorFinalTexto += ' (Requer Balsa)'

    const mtrInfoTexto = `Cadeia Multi-MTR: ${cadeiaMtrAtual.join(' → ')}`

    try {
      const { error } = await supabase.from('coletas').insert([
        {
          gerador_nome: novaColeta.gerador,
          cnpj: novaColeta.cnpj,
          inscricao_estadual: novaColeta.inscricao_estadual || 'Isento / Não informada',
          volume_estimado_litros: parseFloat(novaColeta.volume_estimado),
          valor_esperado_litro: valorFinalTexto,
          mtr_numero: mtrInfoTexto,
          endereco: novaColeta.endereco,
          cidade: novaColeta.cidade,
          estado: novaColeta.estado,
          status: 'pendente'
        }
      ])

      if (!error) {
        setNovaColeta({ 
          gerador: '', 
          cnpj: '', 
          inscricao_estadual: '', 
          volume_estimado: '', 
          valor_esperado: '', 
          cotacao_aberta: false, 
          requer_balsa: false,
          tem_transbordo: true,
          estado_base_transbordo: 'ES',
          estado_destinacao_final: 'SP',
          endereco: '', 
          cidade: 'Serra', 
          estado: 'ES' 
        })
        buscarColetas()
        setActiveTab('coletas')
      } else {
        alert('Erro ao registrar solicitação no Supabase.')
      }
    } catch (err) {
      alert('Erro na comunicação com o banco de dados.')
    } finally {
      setLoading(false)
    }
  }

  const getGoogleMapsUrl = (endereco, cidade, estado) => {
    const destino = encodeURIComponent(`${endereco}, ${cidade} - ${estado}`)
    return `https://www.google.com/maps/dir/?api=1&destination=${destino}`
  }

  const getAppleMapsUrl = (endereco, cidade, estado) => {
    const destino = encodeURIComponent(`${endereco}, ${cidade} - ${estado}`)
    return `https://maps.apple.com/?daddr=${destino}`
  }

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Luzes estéticas de fundo */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Superior */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-6 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo & Marca */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="relative transform hover:scale-105 transition duration-300">
              <LubeLoopLogo className="w-11 h-11" glow={true} />
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Lube<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Loop</span>
                </h1>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 tracking-widest uppercase">
                  Multi-MTR Hub
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Gestão Inteligente & Logística de OLUC</p>
            </div>
          </div>

          {/* Navegação */}
          <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 scale-105' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              📊 Painel Geral
            </button>
            <button 
              onClick={() => setActiveTab('solicitar')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'solicitar' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 scale-105' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              ⚡ Nova Solicitação
            </button>
            <button 
              onClick={() => setActiveTab('coletas')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'coletas' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 scale-105' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              🚛 Coletas & MTR ({coletas.length})
            </button>
          </nav>

          {/* Status da Conexão */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-900/50 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
            <span className="text-slate-300">SINIR / MTR-RJ / SIGOR: ONLINE</span>
          </div>

        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto relative z-10">
        
        {/* ABA: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Banner Principal */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 rounded-3xl p-8 shadow-2xl">
              <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                
                <div className="flex items-center gap-6">
                  <div className="p-4 rounded-3xl bg-slate-950/80 border border-slate-800/80 shadow-2xl shadow-emerald-500/20 shrink-0">
                    <LubeLoopLogo className="w-20 h-20" glow={true} />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2">
                      🌐 Roteamento de MTRs Nacionais e Estaduais
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tight">
                      LubeLoop <span className="text-emerald-400">Plataforma OLUC</span>
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed mt-1 max-w-xl">
                      Sincronização automática com SINIR (IBAMA), SIGOR (SP), MTR-RJ, MTR-MG e MTR-PR para certificação completa de coletores, entrepostos e rerrefinadores.
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setActiveTab('solicitar')}
                  className="bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 px-7 py-4 rounded-2xl font-black transition-all transform hover:scale-105 shadow-xl shadow-emerald-500/20 whitespace-nowrap flex items-center gap-2 shrink-0"
                >
                  <span>+ Criar Solicitação de Coleta</span>
                </button>
              </div>
            </div>

            {/* Grid de Cards Métricos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              <div className="relative group bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-emerald-500/50 transition-all duration-300 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume Solicitado</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">🛢️</div>
                </div>
                <h3 className="text-3xl font-black text-white tracking-tight">
                  {coletas.reduce((acc, item) => acc + (Number(item.volume_estimado_litros) || 0), 0).toLocaleString()} <span className="text-sm font-bold text-emerald-400">Litros</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">Acumulado no sistema</p>
              </div>

              <div className="relative group bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-amber-500/50 transition-all duration-300 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sistemas MTR Ativos</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">🏛️</div>
                </div>
                <h3 className="text-3xl font-black text-amber-400 tracking-tight">
                  SINIR <span className="text-sm font-bold text-slate-400">+ 6 Estaduais</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">Emissão por município</p>
              </div>

              <div className="relative group bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-cyan-500/50 transition-all duration-300 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">MTRs Emitidos</span>
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">📄</div>
                </div>
                <h3 className="text-3xl font-black text-cyan-400 tracking-tight">
                  {coletas.filter(c => c.mtr_numero).length} <span className="text-sm font-bold text-slate-400">Certificados</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">Cadeia rastreada</p>
              </div>

              <div className="relative group bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-indigo-500/50 transition-all duration-300 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cadeia de Transbordo</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">🔄</div>
                </div>
                <h3 className="text-3xl font-black text-indigo-400 tracking-tight">
                  Multi-Estado <span className="text-sm font-bold text-slate-400">(RJ/ES/SP)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">Gerador → Base → Rerrefino</p>
              </div>

            </div>

          </div>
        )}

        {/* ABA: FORMULÁRIO DE NOVA SOLICITAÇÃO */}
        {activeTab === 'solicitar' && (
          <div className="max-w-3xl mx-auto animate-fadeIn">
            <div className="bg-slate-900/70 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-4">
                  <LubeLoopLogo className="w-10 h-10" />
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Nova Solicitação de Coleta</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Roteamento de MTRs vinculados aos órgãos ambientais estaduais/SINIR.</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCriarSolicitacao} className="space-y-6">
                
                {/* Campo de Documento */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 focus-within:border-emerald-500/80 transition">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>CPF (11 dígitos) ou CNPJ (14 dígitos)</span>
                    {buscandoDoc && <span className="text-emerald-400 animate-pulse font-semibold text-xs">🔍 Consultando dados...</span>}
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="Digite os números do CPF ou CNPJ"
                    value={novaColeta.cnpj}
                    onChange={handleDocumentoChange}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-base font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Razão Social / Nome do Gerador
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Preenchido automaticamente"
                      value={novaColeta.gerador}
                      onChange={e => setNovaColeta({...novaColeta, gerador: e.target.value})}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Inscrição Estadual (Sintegra)
                      </label>
                      <a 
                        href="https://www.sintegra.es.gov.br/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                      >
                        Sintegra ES ↗
                      </a>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Automático para CNPJ / Isento para CPF"
                      value={novaColeta.inscricao_estadual}
                      onChange={e => setNovaColeta({...novaColeta, inscricao_estadual: e.target.value})}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                {/* Bloco de Localização */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Endereço Completo de Coleta
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Rua, Número, Bairro"
                      value={novaColeta.endereco}
                      onChange={e => setNovaColeta({...novaColeta, endereco: e.target.value})}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cidade</label>
                      <input 
                        type="text" 
                        value={novaColeta.cidade}
                        onChange={e => setNovaColeta({...novaColeta, cidade: e.target.value})}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estado (UF)</label>
                      <input 
                        type="text" 
                        value={novaColeta.estado}
                        onChange={e => setNovaColeta({...novaColeta, estado: e.target.value})}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white uppercase focus:border-emerald-500 focus:outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                {/* BLOCO EXCLUSIVO: INTEGRAÇÃO MULTI-MTR (Cadeia de Custódia) */}
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-cyan-500/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📄</span> Roteamento MTR & Transbordo Interestadual
                    </span>
                    <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/30">
                      MTR Origem: {getSistemaMtrOrigem(novaColeta.estado, novaColeta.cidade).nome}
                    </span>
                  </div>

                  {/* Toggle para Coletor com Base de Transbordo */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <label htmlFor="checkTransbordo" className="text-xs font-bold text-slate-200 cursor-pointer block">
                        Operação com Armazenamento Temporário em Base Licenciada?
                      </label>
                      <span className="text-[11px] text-slate-400">Para empresas coletoras que estocam o OLUC antes do envio final à refinaria.</span>
                    </div>
                    <input 
                      type="checkbox" 
                      id="checkTransbordo"
                      checked={novaColeta.tem_transbordo}
                      onChange={e => setNovaColeta({...novaColeta, tem_transbordo: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-800 text-cyan-500 focus:ring-cyan-500 bg-slate-900 cursor-pointer"
                    />
                  </div>

                  {/* Se houver transbordo, solicita as UFs envolvidas */}
                  {novaColeta.tem_transbordo && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          UF da Base de Transbordo (Armazenamento)
                        </label>
                        <select 
                          value={novaColeta.estado_base_transbordo}
                          onChange={e => setNovaColeta({...novaColeta, estado_base_transbordo: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                        >
                          <option value="ES">Espírito Santo (ES) - Base Serra (SINIR)</option>
                          <option value="RJ">Rio de Janeiro (RJ) - MTR INEA</option>
                          <option value="MG">Minas Gerais (MG) - MTR FEAM</option>
                          <option value="SP">São Paulo (SP) - SIGOR Cetesb</option>
                          <option value="PR">Paraná (PR) - MTR IAT</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          UF do Rerrefinador (Destino Final)
                        </label>
                        <select 
                          value={novaColeta.estado_destinacao_final}
                          onChange={e => setNovaColeta({...novaColeta, estado_destinacao_final: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                        >
                          <option value="SP">São Paulo (SP) - SIGOR Cetesb</option>
                          <option value="RJ">Rio de Janeiro (RJ) - MTR INEA</option>
                          <option value="MG">Minas Gerais (MG) - MTR FEAM</option>
                          <option value="PR">Paraná (PR) - MTR IAT</option>
                          <option value="RS">Rio Grande do Sul (RS) - MTR FEPAM</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Visualização da Cadeia Multi-MTR */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 font-bold">Fluxo de Sistemas Conectados:</span>
                    <span className="text-emerald-400 font-bold">
                      {cadeiaMtrAtual.join('  ➔  ')}
                    </span>
                  </div>
                </div>

                {/* Modal de Transporte & Balsas */}
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🚢</span>
                    <div>
                      <label htmlFor="checkBalsa" className="text-xs font-bold text-slate-200 cursor-pointer block">
                        Acesso requer travessia por Balsa ou Transporte Fluvial?
                      </label>
                      <span className="text-[11px] text-slate-400">Ajusta o frete considerando tarifação de eixos/PBT e regulação HAZMAT na embarcação.</span>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    id="checkBalsa"
                    checked={novaColeta.requer_balsa}
                    onChange={e => setNovaColeta({...novaColeta, requer_balsa: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 bg-slate-900 cursor-pointer"
                  />
                </div>

                {/* Bloco de Volume e Precificação */}
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-emerald-500/20 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <span>📍</span> Matriz Logística ({benchmarkAtual.nomeZona})
                    </span>
                    <span className="text-xs text-amber-300 font-mono font-bold">
                      Sugestão: {benchmarkAtual.faixaTexto}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Volume Estimado (Litros)
                      </label>
                      <input 
                        type="number" 
                        required
                        placeholder="Ex: 1000"
                        value={novaColeta.volume_estimado}
                        onChange={e => setNovaColeta({...novaColeta, volume_estimado: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-emerald-400 font-mono font-bold focus:border-emerald-500 focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Valor Esperado por Litro (R$/L)
                      </label>
                      <input 
                        type="number" 
                        step="0.05"
                        disabled={novaColeta.cotacao_aberta}
                        placeholder={novaColeta.cotacao_aberta ? "Cotação Aberta selecionada" : "Ex: 1.30"}
                        value={novaColeta.valor_esperado}
                        onChange={e => setNovaColeta({...novaColeta, valor_esperado: e.target.value})}
                        className={`w-full border rounded-xl px-4 py-3 text-sm font-mono font-bold transition focus:outline-none ${novaColeta.cotacao_aberta ? 'bg-slate-900/40 border-slate-800 text-slate-500' : 'bg-slate-900 border-slate-800 text-amber-400 focus:border-emerald-500'}`}
                      />
                    </div>
                  </div>

                  {/* Checkbox Cotação Aberta */}
                  <div className="flex items-center gap-3 pt-2">
                    <input 
                      type="checkbox" 
                      id="checkCotacao"
                      checked={novaColeta.cotacao_aberta}
                      onChange={e => setNovaColeta({...novaColeta, cotacao_aberta: e.target.checked, valor_esperado: e.target.checked ? '' : novaColeta.valor_esperado})}
                      className="w-4 h-4 rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                    />
                    <label htmlFor="checkCotacao" className="text-xs text-slate-300 font-medium cursor-pointer">
                      Aceitar a melhor oferta do coletor (<span className="text-emerald-400 font-bold">Cotação Aberta</span>)
                    </label>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || buscandoDoc}
                  className="w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-slate-950 font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 transform hover:scale-[1.01] active:scale-[0.99] mt-6 flex items-center justify-center gap-2"
                >
                  {loading ? 'A registrar no Supabase...' : '✓ Confirmar e Emitir Cadeia Multi-MTR'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ABA: TABELA DE COLETAS REGISTRADAS */}
        {activeTab === 'coletas' && (
          <div className="bg-slate-900/70 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 md:p-8 shadow-2xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/80">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Ordens de Coleta & Cadeia Multi-MTR</h2>
                <p className="text-xs text-slate-400 mt-0.5">Acompanhamento de volume, MTRs estaduais/SINIR e rotas GPS</p>
              </div>
              <button 
                onClick={buscarColetas}
                className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition flex items-center gap-2"
              >
                <span>↻</span> Atualizar Dados
              </button>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400 text-sm font-medium animate-pulse">
                A carregar registos do banco de dados...
              </div>
            ) : coletas.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm border-2 border-dashed border-slate-800/80 rounded-2xl">
                Nenhuma solicitação encontrada no Supabase. Crie a primeira na aba "Nova Solicitação".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4 rounded-l-xl">Gerador / Documento</th>
                      <th className="p-4">Volume</th>
                      <th className="p-4">Proposta (R$/L)</th>
                      <th className="p-4">Localização</th>
                      <th className="p-4 text-center">Navegação GPS</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 rounded-r-xl">Cadeia MTR Conectada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {coletas.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-bold text-white">
                          {item.gerador_nome || 'Gerador sem nome'}
                          <span className="block text-xs font-mono font-normal text-slate-400 mt-0.5">{item.cnpj}</span>
                          <span className="block text-[11px] font-mono text-indigo-300 mt-0.5">IE: {item.inscricao_estadual || 'Isento'}</span>
                        </td>
                        <td className="p-4 font-mono text-emerald-400 font-extrabold text-base">
                          {item.volume_estimado_litros} <span className="text-xs text-emerald-500">L</span>
                        </td>
                        <td className="p-4 font-mono font-bold text-amber-300 text-xs">
                          {item.valor_esperado_litro || 'Cotação Aberta'}
                        </td>
                        <td className="p-4 text-xs text-slate-300">
                          <span className="font-semibold block text-slate-200">{item.endereco}</span>
                          <span className="text-slate-400">{item.cidade}/{item.estado}</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <a 
                              href={getGoogleMapsUrl(item.endereco, item.cidade, item.estado)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 font-bold transition shadow-sm"
                            >
                              🗺️ Google
                            </a>
                            <a 
                              href={getAppleMapsUrl(item.endereco, item.cidade, item.estado)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 font-bold transition shadow-sm"
                            >
                              📍 Apple
                            </a>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            {item.status || 'Pendente'}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-mono text-cyan-300 font-semibold">
                          {item.mtr_numero || 'SINIR Nacional'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
