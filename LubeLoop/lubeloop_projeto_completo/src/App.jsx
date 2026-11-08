import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Inicialização da conexão ao Supabase
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

  // Consulta inteligente: CPF no Supabase vs CNPJ na Receita/Sintegra por UF
  const handleDocumentoChange = async (e) => {
    const valorDigitado = e.target.value
    setNovaColeta(prev => ({ ...prev, cnpj: valorDigitado }))
    const docLimpo = valorDigitado.replace(/\D/g, '')

    // 1. CPF (11 dígitos): Consulta histórico no Supabase
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

    // 2. CNPJ (14 dígitos): Consulta Receita Federal e Sintegra por UF
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
    try {
      const { error } = await supabase.from('coletas').insert([
        {
          gerador_nome: novaColeta.gerador,
          cnpj: novaColeta.cnpj,
          inscricao_estadual: novaColeta.inscricao_estadual || 'Isento / Não informada',
          volume_estimado_litros: parseFloat(novaColeta.volume_estimado),
          endereco: novaColeta.endereco,
          cidade: novaColeta.cidade,
          estado: novaColeta.estado,
          status: 'pendente'
        }
      ])

      if (!error) {
        setNovaColeta({ gerador: '', cnpj: '', inscricao_estadual: '', volume_estimado: '', endereco: '', cidade: 'Serra', estado: 'ES' })
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
      
      {/* Glow de fundo estético */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Superior Moderno */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-6 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Brand / Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-emerald-500/30 transform hover:scale-105 transition">
                LL
              </div>
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
                  SaaS 2.0
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Gestão Inteligente & Logística de OLUC</p>
            </div>
          </div>

          {/* Tab Navigation Pill */}
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
            <span className="text-slate-300">Supabase & Receita: ON</span>
          </div>

        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto relative z-10">
        
        {/* ABA: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn">
            
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
                <p className="text-[11px] text-slate-500 mt-2 font-medium">Acumulado em tempo real</p>
              </div>

              <div className="relative group bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-amber-500/50 transition-all duration-300 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pendentes</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">⏳</div>
                </div>
                <h3 className="text-3xl font-black text-amber-400 tracking-tight">
                  {coletas.filter(c => c.status === 'pendente').length} <span className="text-sm font-bold text-slate-400">Ordens</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">Aguardando recolha de frota</p>
              </div>

              <div className="relative group bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-cyan-500/50 transition-all duration-300 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">MTRs Emitidos</span>
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">📄</div>
                </div>
                <h3 className="text-3xl font-black text-cyan-400 tracking-tight">
                  {coletas.filter(c => c.mtr_numero).length} <span className="text-sm font-bold text-slate-400">SINIR</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">Manifestos ambientais</p>
              </div>

              <div className="relative group bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-indigo-500/50 transition-all duration-300 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rotas & GPS</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">🗺️</div>
                </div>
                <h3 className="text-3xl font-black text-indigo-400 tracking-tight">
                  Google <span className="text-sm font-bold text-slate-400">& Apple</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">Navegação ativa em 1 toque</p>
              </div>

            </div>

            {/* Banner de Ação Rápida */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 rounded-3xl p-8 shadow-2xl">
              <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
                    🚀 Automação Fiscal & Logística
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
                    Coleta Inteligente de Óleo Usado (OLUC)
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Pesquisa automática de CNPJ/CPF integrada à Receita Federal e ao Sintegra ES com diferenciação entre Matriz e Filiais. Rotas GPS automáticas para o motorista no campo.
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab('solicitar')}
                  className="bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 px-7 py-4 rounded-2xl font-black transition-all transform hover:scale-105 shadow-xl shadow-emerald-500/20 whitespace-nowrap flex items-center gap-2"
                >
                  <span>+ Nova Solicitação</span>
                </button>
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
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Nova Solicitação de Coleta</h2>
                  <p className="text-xs text-slate-400 mt-1">Preencha o CPF ou CNPJ para busca automática de dados cadastrais e fiscais.</p>
                </div>
                <span className="hidden sm:block text-2xl">⚡</span>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Volume Estimado (Litros)
                    </label>
                    <input 
                      type="number" 
                      required
                      placeholder="Ex: 1000"
                      value={novaColeta.volume_estimado}
                      onChange={e => setNovaColeta({...novaColeta, volume_estimado: e.target.value})}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-emerald-400 font-mono font-bold focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Endereço Completo
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
                </div>

                <div className="grid grid-cols-2 gap-5">
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
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || buscandoDoc}
                  className="w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-slate-950 font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 transform hover:scale-[1.01] active:scale-[0.99] mt-6 flex items-center justify-center gap-2"
                >
                  {loading ? 'A registrar no Supabase...' : '✓ Confirmar e Gerar Solicitação'}
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
                <h2 className="text-2xl font-black text-white tracking-tight">Ordens de Coleta Registradas</h2>
                <p className="text-xs text-slate-400 mt-0.5">Acompanhamento e atalhos diretos de rota GPS para os motoristas</p>
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
                      <th className="p-4">Inscrição Estadual</th>
                      <th className="p-4">Volume</th>
                      <th className="p-4">Localização</th>
                      <th className="p-4 text-center">Navegação GPS</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 rounded-r-xl">MTR SINIR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {coletas.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-bold text-white">
                          {item.gerador_nome || 'Gerador sem nome'}
                          <span className="block text-xs font-mono font-normal text-slate-400 mt-0.5">{item.cnpj}</span>
                        </td>
                        <td className="p-4 text-xs font-mono text-indigo-300">
                          {item.inscricao_estadual || 'Isento / Não informada'}
                        </td>
                        <td className="p-4 font-mono text-emerald-400 font-extrabold text-base">
                          {item.volume_estimado_litros} <span className="text-xs text-emerald-500">L</span>
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
                        <td className="p-4 text-xs font-mono text-slate-400">
                          {item.mtr_numero || 'Pendente de emissão'}
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
