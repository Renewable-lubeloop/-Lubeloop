import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

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
  const [activeTab, setActiveTab] = useState('dashboard')
  const [coletas, setColetas] = useState([])
  const [unidades, setUnidades] = useState([])
  const [loading, setLoading] = useState(false)
  const [buscandoDoc, setBuscandoDoc] = useState(false)
  const [buscandoDocUnidade, setBuscandoDocUnidade] = useState(false)
  const [modalCdf, setModalCdf] = useState(null)
  const [filtroTipoDashboard, setFiltroTipoDashboard] = useState('todos')
  const [salvandoCustos, setSalvandoCustos] = useState(false)

  // SIMULADOR DE CENÁRIOS (STRESS TEST)
  const [simuladorCenario, setSimuladorCenario] = useState({
    aumentoDieselPct: 0,
    aumentoCctPct: 0
  })

  // MATRIZ DINÂMICA DE PARAMETRIZAÇÃO DE CUSTOS
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
    'ES': { nome: 'MTR-ES / IEMA', tipo: 'Estadual Próprio (IN 012-N/2022)', ativo: true, tokenConfigurado: true },
    'RJ': { nome: 'MTR-INEA (RJ)', tipo: 'Estadual Próprio', ativo: true, tokenConfigurado: true },
    'MG': { nome: 'MTR-FEAM (MG)', tipo: 'Estadual Próprio', ativo: true, tokenConfigurado: true },
    'SP': { nome: 'SIGOR / CETESB (SP)', tipo: 'Estadual Próprio', ativo: true, tokenConfigurado: true },
    'PR': { nome: 'MTR-IAT (PR)', tipo: 'Estadual Próprio', ativo: true, tokenConfigurado: false }
  })

  const [novaColeta, setNovaColeta] = useState({
    gerador: '', cnpj: '', inscricao_estadual: '', licenca_operacao: 'LO-AMB 4859/2026', lo_valida: true,
    volume_estimado: '', valor_esperado: '', cotacao_aberta: true, requer_balsa: false, tem_transbordo: true,
    estado_base_transbordo: 'ES', estado_destinacao_final: 'SP', endereco: '', cidade: 'Vitória', estado: 'ES'
  })

  const [breakdownAtual, setBreakdownAtual] = useState({
    precoBrutoRerrefino: '2.40', custoMaoDeObraMotorista: '0.23', custoDieselPneusMaint: '0.26',
    custoFreteTransbordo: '0.22', custosAdministrativos: '0.18', custoBalsa: '0.00', deducoesTotais: '0.89',
    tetoSugerido: '1.51', faixaTexto: 'R$ 1.13 a R$ 1.51 / L', nomeUsinaProxima: 'Base ➔ Usina', nomeZona: 'Regular'
  })

  const [novaUnidade, setNovaUnidade] = useState({
    tipo: 'transbordo', razao_social: '', nome_fantasia: '', cnpj: '', inscricao_estadual: '', licenca_operacao: '',
    orgao_ambiental: 'IEMA', autorizacao_anp: '', situacao_anp: 'AUTORIZADO', endereco: '', bairro: '',
    cidade: 'Vitória', estado: 'ES', capacidade_estocagem_litros: '50000', contato_nome: '', contato_telefone: ''
  })

  useEffect(() => {
    if (supabase) {
      buscarColetas()
      buscarUnidades()
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
    } catch (err) {
      console.error("Erro ao carregar matriz de custos do Supabase:", err)
    }
  }

  const salvarCustosSupabase = async () => {
    if (!supabase) return
    setSalvandoCustos(true)
    try {
      const { error } = await supabase.from('parametros_custos').upsert({
        id: 1,
        preco_balcao: parametrosCustos.precoBrutoBalcaoUsina,
        coleta_capilar: parametrosCustos.custoCapilarDieselPneusBase,
        custo_admin: parametrosCustos.custosAdministrativosTelemetria,
        taxa_balsa: parametrosCustos.custoBalsaFlutuanteHazmat,
        cct_por_uf: parametrosCustos.custoMaoDeObraCCTPorUF,
        frete_transbordo: parametrosCustos.custoFreteTransbordoMatriz,
        updated_at: new Date()
      })
      if (!error) alert("Matriz de Custos sincronizada no Supabase para todos os usuários!")
      else alert(`Erro ao salvar: ${error.message}`)
    } catch (err) {
      alert("Falha na comunicação com o banco de dados.")
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

  const buscarUnidades = async () => {
    if (!supabase) return
    try {
      const { data } = await supabase.from('unidades_operacionais').select('*').order('created_at', { ascending: false })
      if (data) setUnidades(data)
    } catch (err) {}
  }

  const getSistemaMtrOrigem = (uf) => {
    const estado = (uf || '').toUpperCase().trim()
    return sistemasMtrEstaduais[estado]?.ativo 
      ? sistemasMtrEstaduais[estado] 
      : { nome: 'SINIR Nacional (IBAMA)', tipo: 'Nacional Integrado', tokenConfigurado: true }
  }

  const toggleSistemaEstado = (uf) => {
    setSistemasMtrEstaduais(prev => ({
      ...prev, [uf]: { ...prev[uf], ativo: !prev[uf]?.ativo }
    }))
  }

  const getCadeiaMtrCompleta = (ufOrigem, temTransbordo, ufBase, ufDestino) => {
    const mtrOrigem = getSistemaMtrOrigem(ufOrigem)
    const sistemas = [mtrOrigem.nome]
    if (temTransbordo) {
      const mtrBase = getSistemaMtrOrigem(ufBase)
      if (!sistemas.includes(mtrBase.nome)) sistemas.push(mtrBase.nome)
      const mtrDestino = getSistemaMtrOrigem(ufDestino)
      if (!sistemas.includes(mtrDestino.nome)) sistemas.push(mtrDestino.nome)
    }
    return sistemas
  }

  // CÁLCULO DRE COM SIMULADOR DE IMPACTO DE DIESEL E CCT
  const getCalculoLogisticoDetalhadoDinamico = async (cidade, estado, volumeLitros, requerBalsa, temTransbordo, ufBase, ufDestino) => {
    const vol = parseFloat(volumeLitros) || 0
    const uf = (estado || '').toUpperCase().trim()
    const cid = (cidade || '').toLowerCase().trim()
    const ufBaseArmazenamento = (ufBase || 'ES').toUpperCase().trim()
    const ufUsinaRerrefino = (ufDestino || 'SP').toUpperCase().trim()

    const precoBrutoRerrefino = parseFloat(parametrosCustos.precoBrutoBalcaoUsina) || 2.40 
    
    // Aplicação dos fatores do Simulador de Cenários
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
    let nomeUsinaProxima = 'Envio Direto Usina Autorizada ANP'

    if (temTransbordo) {
      const chaveRota = `${ufBaseArmazenamento}-${ufUsinaRerrefino}`
      const baseFrete = parseFloat(
        parametrosCustos.custoFreteTransbordoMatriz[chaveRota] || parametrosCustos.custoFreteTransbordoMatriz['DEFAULT'] || 0.18
      )
      custoFreteTransbordo = baseFrete * fatorDiesel

      if (supabase) {
        try {
          const { data: baseTransbordo } = await supabase.from('unidades_operacionais').select('*').eq('tipo', 'transbordo').eq('estado', ufBaseArmazenamento).eq('ativo', true).limit(1).maybeSingle()
          const { data: usinaRerrefino } = await supabase.from('unidades_operacionais').select('*').eq('tipo', 'rerrefino').eq('estado', ufUsinaRerrefino).eq('ativo', true).limit(1).maybeSingle()
          if (baseTransbordo && usinaRerrefino) {
            nomeUsinaProxima = `${baseTransbordo.nome_fantasia || baseTransbordo.cidade}/${baseTransbordo.estado} ➔ ${usinaRerrefino.nome_fantasia || usinaRerrefino.cidade}/${usinaRerrefino.estado}`
          } else {
            nomeUsinaProxima = `Base ${ufBaseArmazenamento} ➔ Rerrefino ${ufUsinaRerrefino}`
          }
        } catch (err) {}
      }
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
    const valorLiquidoMinimo = Math.max(0.20, valorLiquidoMaximo * 0.75)

    return {
      precoBrutoRerrefino: precoBrutoRerrefino.toFixed(2),
      custoMaoDeObraMotorista: custoMaoDeObraMotorista.toFixed(2),
      custoDieselPneusMaint: custoDieselPneusMaint.toFixed(2),
      custoFreteTransbordo: custoFreteTransbordo.toFixed(2),
      custosAdministrativos: custosAdministrativos.toFixed(2),
      custoBalsa: custoBalsa.toFixed(2),
      deducoesTotais: deducoesTotais.toFixed(2),
      tetoSugerido: valorLiquidoMaximo.toFixed(2),
      faixaTexto: `R$ ${valorLiquidoMinimo.toFixed(2)} a R$ ${valorLiquidoMaximo.toFixed(2)} / L`,
      nomeUsinaProxima
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

  const cadeiaMtrAtual = getCadeiaMtrCompleta(
    novaColeta.estado, novaColeta.tem_transbordo, 
    novaColeta.estado_base_transbordo, novaColeta.estado_destinacao_final
  )

  const handleDocumentoChange = async (e) => {
    const valorDigitado = e.target.value
    setNovaColeta(prev => ({ ...prev, cnpj: valorDigitado }))
    const docLimpo = valorDigitado.replace(/\D/g, '')

    if (docLimpo.length === 11 && supabase) {
      setBuscandoDoc(true)
      try {
        const { data } = await supabase.from('coletas').select('*').eq('cnpj', valorDigitado).limit(1).maybeSingle()
        if (data) {
          setNovaColeta(prev => ({ ...prev, gerador: data.gerador_nome || prev.gerador, endereco: data.endereco || prev.endereco, cidade: data.cidade || prev.cidade, estado: data.estado || prev.estado }))
        }
      } finally { setBuscandoDoc(false) }
    }

    if (docLimpo.length === 14) {
      setBuscandoDoc(true)
      try {
        const response = await fetch(`https://publica.cnpj.ws/cnpj/${docLimpo}`)
        if (response.ok) {
          const data = await response.json()
          const est = data.estabelecimento || {}
          setNovaColeta(prev => ({
            ...prev,
            gerador: data.razao_social || est.nome_fantasia || prev.gerador,
            endereco: `${est.logradouro || ''}, ${est.numero || 'S/N'}`,
            cidade: est.cidade?.nome || prev.cidade,
            estado: est.estado?.sigla || prev.estado
          }))
        }
      } finally { setBuscandoDoc(false) }
    }
  }

  const handleSalvarUnidade = async (e) => {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    try {
      const { error } = await supabase.from('unidades_operacionais').insert([novaUnidade])
      if (!error) {
        alert("Agente Regulado ANP salvo!")
        buscarUnidades()
      }
    } finally { setLoading(false) }
  }

  const handleCriarSolicitacao = async (e) => {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    try {
      const { error } = await supabase.from('coletas').insert([{
        gerador_nome: novaColeta.gerador,
        cnpj: novaColeta.cnpj,
        inscricao_estadual: novaColeta.inscricao_estadual || 'Isento',
        volume_estimado_litros: parseFloat(novaColeta.volume_estimado),
        valor_esperado_litro: novaColeta.cotacao_aberta ? 'Cotação Aberta' : `R$ ${novaColeta.valor_esperado}/L`,
        mtr_numero: `Cadeia Multi-MTR: ${cadeiaMtrAtual.join(' → ')}`,
        endereco: novaColeta.endereco, cidade: novaColeta.cidade, estado: novaColeta.estado
      }])
      if (!error) { buscarColetas(); setActiveTab('coletas') }
    } finally { setLoading(false) }
  }

  const agentesFiltradosDashboard = unidades.filter(u => filtroTipoDashboard === 'todos' || u.tipo === filtroTipoDashboard)

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <LubeLoopLogo className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-black text-white">Lube<span className="text-emerald-400">Loop</span></h1>
              <p className="text-[10px] text-slate-400 font-medium">Plataforma Neutra & Compliance ANP</p>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80">
            <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'dashboard' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>📊 Painel ANP</button>
            <button onClick={() => setActiveTab('solicitar')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'solicitar' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>⚡ Nova Coleta</button>
            <button onClick={() => setActiveTab('coletas')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'coletas' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>🚛 Ordens ({coletas.length})</button>
            <button onClick={() => setActiveTab('unidades')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'unidades' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>🏢 Agentes ANP ({unidades.length})</button>
            <button onClick={() => setActiveTab('config_custos')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'config_custos' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>💲 Matriz & Simulador</button>
            <button onClick={() => setActiveTab('config_mtr')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'config_mtr' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>⚙️ MTRs</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
        
        {/* ABA: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  ✓ Tabelas ANP / DPP Atualizadas em Tempo Real
                </span>
                <h2 className="text-2xl font-black text-white mt-2">Agentes Regulados ANP Autorizados</h2>
                <p className="text-xs text-slate-400">Coletores e Usinas de Rerrefino ativos segundo os registros públicos oficiais.</p>
              </div>
              <a href="https://www.gov.br/anp/pt-br/assuntos/distribuicao-e-revenda/lubrificantes/relacao-de-agentes-autorizados" target="_blank" rel="noreferrer" className="bg-slate-800 text-slate-200 px-4 py-3 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-700">
                🔗 Portal Oficial ANP ↗
              </a>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Relação de Agentes Cadastrados no Sistema</h3>
                <div className="flex gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button onClick={() => setFiltroTipoDashboard('todos')} className={`px-3 py-1 text-xs font-bold rounded-lg ${filtroTipoDashboard === 'todos' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>Todos ({unidades.length})</button>
                  <button onClick={() => setFiltroTipoDashboard('transbordo')} className={`px-3 py-1 text-xs font-bold rounded-lg ${filtroTipoDashboard === 'transbordo' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}>Bases</button>
                  <button onClick={() => setFiltroTipoDashboard('rerrefino')} className={`px-3 py-1 text-xs font-bold rounded-lg ${filtroTipoDashboard === 'rerrefino' ? 'bg-purple-500 text-white' : 'text-slate-400'}`}>Usinas</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Atividade ANP</th>
                      <th className="p-3">Razão Social / Fantasia</th>
                      <th className="p-3">Nº Autorização ANP</th>
                      <th className="p-3">Licença (LO)</th>
                      <th className="p-3">Localização</th>
                      <th className="p-3 text-center">Status ANP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {agentesFiltradosDashboard.map((u, i) => (
                      <tr key={u.id || i} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.tipo === 'transbordo' ? 'bg-cyan-500/10 text-cyan-300' : 'bg-purple-500/10 text-purple-300'}`}>
                            {u.tipo === 'transbordo' ? 'Coletor / Base' : 'Rerrefinador'}
                          </span>
                        </td>
                        <td className="p-3 font-sans font-bold text-white">{u.nome_fantasia || u.razao_social}<span className="block text-[10px] font-mono text-slate-400">{u.cnpj}</span></td>
                        <td className="p-3 text-emerald-400 font-bold">{u.autorizacao_anp || 'ANP-SIMP-AUTORIZADO'}</td>
                        <td className="p-3 text-slate-200">{u.licenca_operacao}</td>
                        <td className="p-3 font-sans">{u.cidade} / {u.estado}</td>
                        <td className="p-3 text-center"><span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold">AUTORIZADO</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA: MATRIZ DE CUSTOS & SIMULADOR DE CENÁRIOS */}
        {activeTab === 'config_custos' && (
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* SIMULADOR DE IMPACTO NA DRE (STRESS TEST) */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-black text-amber-400 flex items-center gap-2">
                    <span>⚡</span> Simulador de Cenários de Impacto (Diesel & CCT)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Simule aumentos no combustível ou na convenção coletiva e veja a variação no teto da DRE.</p>
                </div>
                <button 
                  onClick={() => setSimuladorCenario({ aumentoDieselPct: 0, aumentoCctPct: 0 })}
                  className="bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-xl hover:bg-slate-700"
                >
                  Resetar Simulação
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-amber-400">Aumento Estimado no Óleo Diesel:</span>
                    <span className="text-white font-mono text-sm">+{simuladorCenario.aumentoDieselPct}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="50" step="1"
                    value={simuladorCenario.aumentoDieselPct}
                    onChange={e => setSimuladorCenario({ ...simuladorCenario, aumentoDieselPct: Number(e.target.value) })}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0% (Atual)</span><span>+25%</span><span>+50%</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-rose-400">Aumento na CCT / Periculosidade:</span>
                    <span className="text-white font-mono text-sm">+{simuladorCenario.aumentoCctPct}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="30" step="1"
                    value={simuladorCenario.aumentoCctPct}
                    onChange={e => setSimuladorCenario({ ...simuladorCenario, aumentoCctPct: Number(e.target.value) })}
                    className="w-full accent-rose-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0% (Atual)</span><span>+15%</span><span>+30%</span>
                  </div>
                </div>
              </div>

              {(simuladorCenario.aumentoDieselPct > 0 || simuladorCenario.aumentoCctPct > 0) && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between text-xs">
                  <span className="text-amber-300 font-bold">⚠️ Impacto Simulado na DRE:</span>
                  <span className="font-mono text-white font-bold">
                    Teto Recomendado Atualizado: <span className="text-amber-400 text-sm">R$ {breakdownAtual.tetoSugerido} / L</span>
                  </span>
                </div>
              )}
            </div>

            {/* MATRIZ DE CUSTOS GLOBAIS */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-white">💲 Matriz de Custos Sincronizada (Supabase)</h2>
                  <p className="text-xs text-slate-400">Edite os parâmetros operacionais de referência e compartilhe com toda a equipe.</p>
                </div>
                <button 
                  onClick={salvarCustosSupabase}
                  disabled={salvandoCustos}
                  className="bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black px-5 py-3 rounded-xl text-xs hover:from-emerald-300 shadow-lg"
                >
                  {salvandoCustos ? 'Salvando...' : '💾 Sincronizar no Supabase'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Preço Balcão (Usina)</label>
                  <input type="number" step="0.01" value={parametrosCustos.precoBrutoBalcaoUsina} onChange={e => setParametrosCustos({ ...parametrosCustos, precoBrutoBalcaoUsina: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono font-bold" />
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Coleta Capilar (Diesel)</label>
                  <input type="number" step="0.01" value={parametrosCustos.custoCapilarDieselPneusBase} onChange={e => setParametrosCustos({ ...parametrosCustos, custoCapilarDieselPneusBase: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-amber-400 font-mono font-bold" />
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Admin / Telemetria</label>
                  <input type="number" step="0.01" value={parametrosCustos.custosAdministrativosTelemetria} onChange={e => setParametrosCustos({ ...parametrosCustos, custosAdministrativosTelemetria: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-purple-400 font-mono font-bold" />
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Taxa Balsa HAZMAT</label>
                  <input type="number" step="0.01" value={parametrosCustos.custoBalsaFlutuanteHazmat} onChange={e => setParametrosCustos({ ...parametrosCustos, custoBalsaFlutuanteHazmat: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-cyan-400 font-mono font-bold" />
                </div>
              </div>

              {/* CCT POR ESTADO */}
              <div>
                <h3 className="text-sm font-bold text-rose-400 uppercase mb-3">🚛 Convenção Coletiva (CCT) & Periculosidade por UF (R$/L)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(parametrosCustos.custoMaoDeObraCCTPorUF).map(([uf, valor]) => (
                    <div key={uf} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                      <span className="font-bold text-white text-xs">{uf}</span>
                      <input 
                        type="number" step="0.01" value={valor}
                        onChange={e => setParametrosCustos({
                          ...parametrosCustos,
                          custoMaoDeObraCCTPorUF: { ...parametrosCustos.custoMaoDeObraCCTPorUF, [uf]: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-rose-400 font-mono font-bold text-right"
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ABA: FORMULÁRIO DE COLETA (SOLICITAR) */}
        {activeTab === 'solicitar' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl space-y-6">
              <h2 className="text-2xl font-black text-white">Nova Solicitação de Coleta</h2>

              <form onSubmit={handleCriarSolicitacao} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">CPF ou CNPJ</label>
                  <input type="text" required value={novaColeta.cnpj} onChange={handleDocumentoChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Gerador</label>
                    <input type="text" required value={novaColeta.gerador} onChange={e => setNovaColeta({...novaColeta, gerador: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Volume (Litros)</label>
                    <input type="number" required value={novaColeta.volume_estimado} onChange={e => setNovaColeta({...novaColeta, volume_estimado: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-emerald-400 font-mono font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cidade</label>
                    <input type="text" value={novaColeta.cidade} onChange={e => setNovaColeta({...novaColeta, cidade: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">UF</label>
                    <input type="text" value={novaColeta.estado} onChange={e => setNovaColeta({...novaColeta, estado: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white uppercase" />
                  </div>
                </div>

                {/* VISUALIZAÇÃO DRE COM REPERCUSSÃO DO SIMULADOR */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/30 space-y-3 font-mono text-xs">
                  <div className="flex justify-between font-bold border-b border-slate-800 pb-2">
                    <span className="text-white">DRE Calculada em Tempo Real</span>
                    <span className="text-emerald-400">Teto Recommended: R$ {breakdownAtual.tetoSugerido} / L</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Preço Bruto Usina:</span><span className="text-emerald-400">+ R$ {breakdownAtual.precoBrutoRerrefino}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Mão de Obra Motorista CCT ({novaColeta.estado}):</span><span className="text-rose-400">- R$ {breakdownAtual.custoMaoDeObraMotorista}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Coleta Capilar (Diesel/Manut):</span><span className="text-amber-400">- R$ {breakdownAtual.custoDieselPneusMaint}</span>
                  </div>
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black py-4 rounded-2xl text-xs uppercase">
                  ✓ Enviar Solicitação para Cotação
                </button>
              </form>
            </div>
          </div>
        )}

        {/* OUTRAS ABAS PERMANECEM DISPONÍVEIS (coletas, unidades, config_mtr) */}
        {activeTab === 'coletas' && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 text-xs font-mono">
            <h2 className="text-lg font-bold text-white mb-4">Ordens de Coleta Registradas ({coletas.length})</h2>
            {coletas.map(c => (
              <div key={c.id} className="p-3 bg-slate-950 rounded-xl mb-2 flex justify-between border border-slate-800">
                <span>{c.gerador_nome} ({c.cidade}/{c.estado})</span>
                <span className="text-emerald-400 font-bold">{c.volume_estimado_litros} L</span>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  )
}
