import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Logo Vetorial LubeLoop
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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null

export default function App() {
  const [activeTab, setActiveTab] = useState('solicitar')
  const [coletas, setColetas] = useState([])
  const [loading, setLoading] = useState(false)
  const [buscandoDoc, setBuscandoDoc] = useState(false)
  const [salvandoCustos, setSalvandoCustos] = useState(false)

  // Controle de Senha para Matriz de Custos (Zaca1304)
  const [senhaMatriz, setSenhaMatriz] = useState('')
  const [matrizLiberada, setMatrizLiberada] = useState(false)
  const SENHA_ADMIN = 'Zaca1304'

  const [simuladorCenario, setSimuladorCenario] = useState({
    aumentoDieselPct: 0,
    aumentoCctPct: 0
  })

  const [parametrosCustos, setParametrosCustos] = useState({
    precoBrutoBalcaoUsina: 2.40,
    custoCapilarDieselPneusBase: 0.30,
    descontoHubLocalES: 0.04,
    custosAdministrativosTelemetria: 0.18,
    custoBalsaFlutuanteHazmat: 0.35,
    custoMaoDeObraCCTPorUF: {
      'ES': 0.23, 'RJ': 0.26, 'MG': 0.24, 'SP': 0.28, 'PR': 0.25, 'SC': 0.25, 'RS': 0.25, 'BA': 0.22
    },
    custoFreteTransbordoMatriz: {
      'ES-SP': 0.22, 'ES-RJ': 0.15, 'MG-SP': 0.16, 'RJ-SP': 0.12, 'PR-SP': 0.18, 'DEFAULT': 0.18
    }
  })

  const [sistemasMtrEstaduais, setSistemasMtrEstaduais] = useState({
    'ES': { nome: 'MTR-ES / IEMA', tipo: 'Estadual Próprio (IN 012-N/2022)', ativo: true },
    'RJ': { nome: 'MTR-INEA (RJ)', tipo: 'Estadual Próprio', ativo: true },
    'MG': { nome: 'MTR-FEAM (MG)', tipo: 'Estadual Próprio', ativo: true },
    'SP': { nome: 'SIGOR / CETESB (SP)', tipo: 'Estadual Próprio', ativo: true },
    'PR': { nome: 'MTR-IAT (PR)', tipo: 'Estadual Próprio', ativo: false }
  })

  const [novaColeta, setNovaColeta] = useState({
    gerador: '', cnpj: '', inscricao_estadual: '', licenca_operacao: 'LO-AMB 4859/2026', lo_valida: true,
    volume_estimado: '', requer_balsa: false, tem_transbordo: true,
    estado_base_transbordo: 'ES', estado_destinacao_final: 'SP', endereco: '', bairro: '', cidade: 'Vitória', estado: 'ES'
  })

  const [breakdownAtual, setBreakdownAtual] = useState({
    tetoSugerido: '1.51'
  })

  useEffect(() => {
    if (supabase) {
      buscarColetas()
      carregarCustosSupabase()
    }
  }, [])

  const carregarCustosSupabase = async () => {
    try {
      const { data } = await supabase.from('parametros_custos').select('*').eq('id', 1).maybeSingle()
      if (data) {
        setParametrosCustos({
          precoBrutoBalcaoUsina: Number(data.preco_balcao),
          custoCapilarDieselPneusBase: Number(data.coleta_capilar),
          descontoHubLocalES: 0.04,
          custosAdministrativosTelemetria: Number(data.custo_admin),
          custoBalsaFlutuanteHazmat: Number(data.taxa_balsa),
          custoMaoDeObraCCTPorUF: data.cct_por_uf || parametrosCustos.custoMaoDeObraCCTPorUF,
          custoFreteTransbordoMatriz: data.frete_transbordo || parametrosCustos.custoFreteTransbordoMatriz
        })
      }
    } catch (err) {}
  }

  const salvarCustosSupabase = async () => {
    if (!supabase) return
    setSalvandoCustos(true)
    try {
      await supabase.from('parametros_custos').upsert({
        id: 1,
        preco_balcao: parametrosCustos.precoBrutoBalcaoUsina,
        coleta_capilar: parametrosCustos.custoCapilarDieselPneusBase,
        custo_admin: parametrosCustos.custosAdministrativosTelemetria,
        taxa_balsa: parametrosCustos.custoBalsaFlutuanteHazmat,
        cct_por_uf: parametrosCustos.custoMaoDeObraCCTPorUF,
        frete_transbordo: parametrosCustos.custoFreteTransbordoMatriz,
        updated_at: new Date()
      })
      alert("Matriz de Custos sincronizada com sucesso no Supabase!")
    } finally {
      setSalvandoCustos(false)
    }
  }

  const buscarColetas = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('coletas').select('*').order('created_at', { ascending: false })
      if (data) setColetas(data)
    } finally { setLoading(false) }
  }

  const getCalculoLogisticoDetalhadoDinamico = async (cidade, estado, volumeLitros, requerBalsa, temTransbordo, ufBase, ufDestino) => {
    const vol = parseFloat(volumeLitros) || 0
    const uf = (estado || '').toUpperCase().trim()
    const cid = (cidade || '').toLowerCase().trim()
    const ufBaseArmazenamento = (ufBase || 'ES').toUpperCase().trim()
    const ufUsinaRerrefino = (ufDestino || 'SP').toUpperCase().trim()

    const precoBrutoRerrefino = parseFloat(parametrosCustos.precoBrutoBalcaoUsina) || 2.40 
    
    const fatorCct = 1 + (simuladorCenario.aumentoCctPct / 100)
    const fatorDiesel = 1 + (simuladorCenario.aumentoDieselPct / 100)

    const baseCct = parseFloat(parametrosCustos.custoMaoDeObraCCTPorUF[uf]) || 0.24
    const custoMaoDeObraMotorista = baseCct * fatorCct

    let baseDiesel = parseFloat(parametrosCustos.custoCapilarDieselPneusBase) || 0.30
    const cidadesHub = ['vitoria', 'vitória', 'serra', 'vila velha', 'cariacica', 'viana']
    if (uf === 'ES' && cidadesHub.includes(cid)) {
      baseDiesel -= parseFloat(parametrosCustos.descontoHubLocalES) || 0.04
    }
    const custoDieselPneusMaint = baseDiesel * fatorDiesel

    let custoFreteTransbordo = 0.00
    if (temTransbordo) {
      const chaveRota = `${ufBaseArmazenamento}-${ufUsinaRerrefino}`
      const baseFrete = parseFloat(
        parametrosCustos.custoFreteTransbordoMatriz[chaveRota] || parametrosCustos.custoFreteTransbordoMatriz['DEFAULT'] || 0.18
      )
      custoFreteTransbordo = baseFrete * fatorDiesel
    }

    const custosAdministrativos = parseFloat(parametrosCustos.custosAdministrativosTelemetria) || 0.18
    const custoBalsa = requerBalsa ? (parseFloat(parametrosCustos.custoBalsaFlutuanteHazmat) || 0.35) : 0.00

    const deducoesTotais = custoMaoDeObraMotorista + custoDieselPneusMaint + custoFreteTransbordo + custosAdministrativos + custoBalsa
    const tetoBaseCalculado = Math.max(0.30, precoBrutoRerrefino - deducoesTotais)

    let fatorEscala = 1.00
    if (vol > 0 && vol <= 200) fatorEscala = 0.75
    else if (vol > 200 && vol <= 300) fatorEscala = 0.80
    else if (vol > 300 && vol <= 500) fatorEscala = 0.85
    else if (vol > 500 && vol <= 1000) fatorEscala = 0.90
    else if (vol > 1000 && vol <= 1500) fatorEscala = 0.95

    const valorLiquidoMaximo = tetoBaseCalculado * fatorEscala

    return {
      tetoSugerido: valorLiquidoMaximo.toFixed(2)
    }
  }

  useEffect(() => {
    const recalcularDRE = async () => {
      const res = await getCalculoLogisticoDetalhadoDinamico(
        novaColeta.cidade, novaColeta.estado, novaColeta.volume_estimado, 
        novaColeta.requer_balsa, novaColeta.tem_transbordo, 
        novaColeta.estado_base_transbordo, novaColeta.estado_destinacao_final
      )
      setBreakdownAtual(res)
    }
    recalcularDRE()
  }, [
    novaColeta.cidade, novaColeta.estado, novaColeta.volume_estimado, 
    novaColeta.requer_balsa, novaColeta.tem_transbordo, 
    novaColeta.estado_base_transbordo, novaColeta.estado_destinacao_final,
    parametrosCustos, simuladorCenario
  ])

  // INTEGRAÇÃO DE BUSCA CNPJ / SINTEGRA (ESTADUAL)
  const handleDocumentoChange = async (e) => {
    const valorDigitado = e.target.value
    setNovaColeta(prev => ({ ...prev, cnpj: valorDigitado }))
    const docLimpo = valorDigitado.replace(/\D/g, '')

    if (docLimpo.length === 14) {
      setBuscandoDoc(true)
      try {
        const response = await fetch(`https://publica.cnpj.ws/cnpj/${docLimpo}`)
        if (response.ok) {
          const data = await response.json()
          const est = data.estabelecimento || {}
          
          // Varredura rigorosa da Inscrição Estadual fornecida pelo Sintegra/Receita Federal na API
          const listaIe = est.inscricoes_estaduais || []
          let ieEncontrada = ''
          if (listaIe.length > 0) {
            // Pega preferencialmente a IE ativa da UF do estabelecimento
            const ieAtiva = listaIe.find(i => i.ativo && i.estado?.sigla === est.estado?.sigla) || listaIe[0]
            ieEncontrada = ieAtiva.numero || ieAtiva.uat || ''
          }

          setNovaColeta(prev => ({
            ...prev,
            gerador: data.razao_social || est.nome_fantasia || prev.gerador,
            inscricao_estadual: ieEncontrada,
            endereco: `${est.logradouro || ''}, ${est.numero || 'S/N'}`,
            bairro: est.bairro || '',
            cidade: est.cidade?.nome || prev.cidade,
            estado: est.estado?.sigla || prev.estado
          }))
        }
      } catch (err) {
        console.error("Erro ao consultar Sintegra/CNPJ", err)
      } finally { 
        setBuscandoDoc(false) 
      }
    }
  }

  const handleCriarSolicitacao = async (e) => {
    e.preventDefault()
    if (!novaColeta.volume_estimado || parseFloat(novaColeta.volume_estimado) <= 0) {
      alert("Por favor, informe o volume de óleo que o cliente tem para vender para prosseguir.")
      return
    }

    if (!supabase) {
      const nova = { 
        id: Date.now(), 
        gerador_nome: novaColeta.gerador, 
        cnpj: novaColeta.cnpj, 
        inscricao_estadual: novaColeta.inscricao_estadual || 'Isento', 
        volume_estimado_litros: parseFloat(novaColeta.volume_estimado), 
        valor_esperado_litro: `R$ ${breakdownAtual.tetoSugerido}/L`, 
        endereco: novaColeta.endereco, 
        cidade: novaColeta.cidade, 
        estado: novaColeta.estado 
      }
      setColetas(prev => [nova, ...prev])
      setActiveTab('coletas')
      return
    }
    
    setLoading(true)
    try {
      const { error } = await supabase.from('coletas').insert([{
        gerador_nome: novaColeta.gerador,
        cnpj: novaColeta.cnpj,
        inscricao_estadual: novaColeta.inscricao_estadual || 'Isento',
        volume_estimado_litros: parseFloat(novaColeta.volume_estimado),
        valor_esperado_litro: `R$ ${breakdownAtual.tetoSugerido}/L`,
        endereco: novaColeta.endereco, 
        cidade: novaColeta.cidade, 
        estado: novaColeta.estado
      }])
      if (!error) { 
        buscarColetas()
        setActiveTab('coletas') 
      }
    } finally { 
      setLoading(false) 
    }
  }

  // CÁLCULOS DOS KPIS EM DESTAQUE
  const volumeTotalCotacao = coletas.reduce((acc, item) => acc + (Number(item.volume_estimado_litros) || 0), 0)

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('solicitar')}>
            <LubeLoopLogo className="w-11 h-11" />
            <div>
              <h1 className="text-2xl font-black text-white">Lube<span className="text-emerald-400">Loop</span></h1>
              <p className="text-xs text-slate-400">Plataforma Neutra de Gestão & Compliance de OLUC</p>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80">
            <button onClick={() => setActiveTab('solicitar')} className={`px-4 py-2 rounded-xl text-xs font-black transition ${activeTab === 'solicitar' ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-lg scale-105' : 'text-emerald-400 hover:text-white'}`}>⚡ Nova Coleta</button>
            <button onClick={() => setActiveTab('coletas')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'coletas' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>🚛 Ordens ({coletas.length})</button>
            <button onClick={() => setActiveTab('config_custos')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'config_custos' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>💲 Matriz Custos</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-8">
        
        {/* BLOCO DE KPIS MAIORES E EM DESTAQUE NO TOPO DA PLATAFORMA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/40 rounded-3xl p-7 shadow-2xl">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">Volume Total em Cotação</span>
            <h3 className="text-4xl font-black text-white">{volumeTotalCotacao.toLocaleString()} <span className="text-base text-emerald-400">Litros</span></h3>
            <p className="text-xs text-slate-500 mt-2">Soma de óleo cadastrado para venda</p>
          </div>
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-indigo-500/40 rounded-3xl p-7 shadow-2xl">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-2">Ordens Registradas</span>
            <h3 className="text-4xl font-black text-indigo-400">{coletas.length} <span className="text-base text-slate-400">Geradores</span></h3>
            <p className="text-xs text-slate-500 mt-2">Captações ativas na plataforma</p>
          </div>
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/40 rounded-3xl p-7 shadow-2xl">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block mb-2">Preço Balcão Referência</span>
            <h3 className="text-4xl font-black text-cyan-400">R$ {parametrosCustos.precoBrutoBalcaoUsina.toFixed(2)} <span className="text-base text-slate-400">/L</span></h3>
            <p className="text-xs text-slate-500 mt-2">Base de cálculo da matriz</p>
          </div>
        </div>

        {/* ABA PRINCIPAL DE ENTRADA: NOVA SOLICITAÇÃO DE COLETA */}
        {activeTab === 'solicitar' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
            
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30 uppercase">
                  ⚡ Motor de Captação e Remuneração
                </span>
                <h2 className="text-3xl font-black text-white tracking-tight mt-3">
                  Nova Solicitação de <span className="text-emerald-400">Coleta de OLUC</span>
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Insira o CNPJ para consulta automática via Sintegra/Receita Federal (puxando a Inscrição Estadual). O valor a pagar ao cliente só é revelado após digitar o volume.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl">
              <form onSubmit={handleCriarSolicitacao} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">CNPJ do Gerador</label>
                    <input type="text" required value={novaColeta.cnpj} onChange={handleDocumentoChange} placeholder="00.000.000/0001-00" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono" />
                    {buscandoDoc && <span className="text-[10px] text-emerald-400 mt-1 block">🔍 Consultando Sintegra / Receita Federal...</span>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">Inscrição Estadual (I.E.) — Sintegra</label>
                    <input type="text" value={novaColeta.inscricao_estadual} onChange={e => setNovaColeta({...novaColeta, inscricao_estadual: e.target.value})} placeholder="Identificada automaticamente pelo CNPJ" className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-4 py-3 text-emerald-300 font-mono font-bold" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Razão Social / Nome do Gerador</label>
                  <input type="text" required value={novaColeta.gerador} onChange={e => setNovaColeta({...novaColeta, gerador: e.target.value})} placeholder="Razão social preenchida pelo Sintegra" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Endereço Completo</label>
                    <input type="text" required value={novaColeta.endereco} onChange={e => setNovaColeta({...novaColeta, endereco: e.target.value})} placeholder="Logradouro, Número, Bairro" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">Volume para Venda (Litros)</label>
                    <input type="number" required value={novaColeta.volume_estimado} onChange={e => setNovaColeta({...novaColeta, volume_estimado: e.target.value})} placeholder="Ex: 1000" className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-emerald-400 font-mono font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cidade</label>
                    <input type="text" value={novaColeta.cidade} onChange={e => setNovaColeta({...novaColeta, cidade: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">UF (Estado)</label>
                    <input type="text" value={novaColeta.estado} onChange={e => setNovaColeta({...novaColeta, estado: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white uppercase" />
                  </div>
                </div>

                {/* VALOR A SER PAGO AO CLIENTE: APRESENTADO APENAS APÓS INFORMAR O VOLUME */}
                {novaColeta.volume_estimado && parseFloat(novaColeta.volume_estimado) > 0 ? (
                  <div className="bg-gradient-to-r from-slate-950 to-emerald-950/40 p-6 rounded-2xl border border-emerald-500/50 flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn">
                    <div>
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Remuneração Calculada para o Cliente ({novaColeta.estado})</span>
                      <p className="text-xs text-slate-400 mt-0.5">Com base no volume informado de {Number(novaColeta.volume_estimado).toLocaleString()} litros e custos logísticos regionais.</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black text-emerald-400 font-mono">R$ {breakdownAtual.tetoSugerido} <span className="text-xs text-slate-400 font-sans">/ Litro</span></span>
                      <span className="block text-[10px] text-slate-400 font-mono mt-1">Total a Pagar: R$ {(parseFloat(novaColeta.volume_estimado) * parseFloat(breakdownAtual.tetoSugerido)).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                    ℹ️ Insira o <strong>Volume para Venda (Litros)</strong> acima para desbloquear e visualizar o valor a ser pago ao cliente por litro.
                  </div>
                )}

                <button type="submit" className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 text-slate-950 font-black py-4 rounded-2xl text-xs uppercase tracking-wider shadow-xl transition transform hover:scale-[1.01]">
                  ✓ Confirmar e Enviar Ordem de Coleta
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MATRIZ DE CUSTOS PROTEGIDA POR SENHA (Zaca1304) */}
        {activeTab === 'config_custos' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
            {!matrizLiberada ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md mx-auto text-center space-y-6 shadow-2xl">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl mx-auto flex items-center justify-center text-xl font-bold border border-amber-500/30">
                  🔒
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Área Restrita — Matriz de Custos</h3>
                  <p className="text-xs text-slate-400 mt-1">Digite a senha de administrador (`Zaca1304`) para acessar.</p>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  if (senhaMatriz === SENHA_ADMIN) setMatrizLiberada(true)
                  else { alert('Senha incorreta!'); setSenhaMatriz('') }
                }} className="space-y-4">
                  <input 
                    type="password" placeholder="Senha..." value={senhaMatriz} onChange={e => setSenhaMatriz(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white text-center font-mono focus:border-amber-500"
                    autoFocus
                  />
                  <button type="submit" className="w-full bg-amber-500 text-slate-950 font-black py-3 rounded-xl text-xs uppercase">
                    Desbloquear Acesso
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <h2 className="text-2xl font-black text-white">💲 Matriz de Custos Global (Supabase)</h2>
                  <button onClick={salvarCustosSupabase} className="bg-emerald-400 text-slate-950 font-black px-5 py-3 rounded-xl text-xs">
                    Salvar Custos
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="block text-xs font-bold text-slate-400 mb-1">Preço Balcão Usina</label>
                    <input type="number" step="0.01" value={parametrosCustos.precoBrutoBalcaoUsina} onChange={e => setParametrosCustos({ ...parametrosCustos, precoBrutoBalcaoUsina: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-emerald-400 font-bold text-xs" />
                  </div>
                </div>
                <button onClick={() => setMatrizLiberada(false)} className="text-xs text-slate-400 underline">Bloquear Novamente</button>
              </div>
            )}
          </div>
        )}

        {/* ABA DE ORDENS REGISTRADAS */}
        {activeTab === 'coletas' && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 text-xs font-mono animate-fadeIn space-y-4">
            <h2 className="text-lg font-bold text-white mb-4">Ordens de Coleta Registradas ({coletas.length})</h2>
            {coletas.length === 0 ? (
              <p className="text-slate-500">Nenhuma ordem registrada. Utilize a aba "Nova Coleta" para cadastrar.</p>
            ) : (
              coletas.map(c => (
                <div key={c.id} className="p-4 bg-slate-950 rounded-xl mb-3 flex flex-col md:flex-row justify-between items-start md:items-center border border-slate-800 gap-2">
                  <div>
                    <span className="font-bold text-white text-sm block">{c.gerador_nome}</span>
                    <span className="text-[10px] text-slate-400">CNPJ: {c.cnpj} | I.E. (Sintegra): <strong className="text-emerald-400">{c.inscricao_estadual}</strong></span>
                    <span className="block text-[10px] text-slate-500">{c.cidade}/{c.estado} — Endereço: {c.endereco}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-bold text-sm block">{Number(c.volume_estimado_litros).toLocaleString()} Litros</span>
                    <span className="text-xs text-slate-300">Remuneração: {c.valor_esperado_litro}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </main>
    </div>
  )
}
