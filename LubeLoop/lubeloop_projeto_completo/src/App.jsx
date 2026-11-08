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
  const [activeTab, setActiveTab] = useState('dashboard')
  const [coletas, setColetas] = useState([])
  const [unidades, setUnidades] = useState([])
  const [buscaAnp, setBuscaAnp] = useState('')
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

  // MATRIZ DINÂMICA DE CUSTOS DA DRE
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
      console.error("Erro ao carregar custos:", err)
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
      if (!error) alert("Matriz de Custos sincronizada globalmente no Supabase!")
      else alert(`Erro ao salvar: ${error.message}`)
    } catch (err) {
      alert("Erro na comunicação com o banco de dados.")
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
      // Tenta primeiro carregar da tabela publica dedicada de agentes ANP
      const { data: anpData, error } = await supabase.from('agentes_anp').select('*').order('created_at', { ascending: false })
      if (!error && anpData && anpData.length > 0) {
        setUnidades(anpData)
      } else {
        const { data: opData } = await supabase.from('unidades_operacionais').select('*').order('created_at', { ascending: false })
        if (opData) setUnidades(opData)
      }
    } catch (err) {
      console.error("Erro ao buscar agentes ANP:", err)
    }
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

  // CÁLCULO DRE REATIVO
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
      const { error } = await supabase.from('agentes_anp').insert([novaUnidade])
      if (!error) {
        alert("Agente Regulado salvo na base nativa da LubeLoop!")
        buscarUnidades()
      } else {
        await supabase.from('unidades_operacionais').insert([novaUnidade])
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

  // FILTRAGEM LOCAL COMPLETA DA BASE ANP DA LUBELOOP
  const agentesFiltradosDashboard = unidades.filter(u => {
    const matchTipo = filtroTipoDashboard === 'todos' || u.tipo === filtroTipoDashboard
    const termo = buscaAnp.toLowerCase().trim()
    if (!termo) return matchTipo

    const matchTexto = 
      (u.razao_social || '').toLowerCase().includes(termo) ||
      (u.nome_fantasia || '').toLowerCase().includes(termo) ||
      (u.cnpj || '').includes(termo) ||
      (u.autorizacao_anp || '').toLowerCase().includes(termo) ||
      (u.cidade || '').toLowerCase().includes(termo) ||
      (u.estado || '').toLowerCase().includes(termo)

    return matchTipo && matchTexto
  })

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Header LubeLoop Neutro */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <LubeLoopLogo className="w-11 h-11" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Lube<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Loop</span>
                </h1>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                  Base Direta ANP
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Plataforma Neutra de Gestão & Compliance de OLUC</p>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80">
            <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>📊 Base ANP LubeLoop</button>
            <button onClick={() => setActiveTab('solicitar')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'solicitar' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>⚡ Nova Coleta</button>
            <button onClick={() => setActiveTab('coletas')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'coletas' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>🚛 Ordens ({coletas.length})</button>
            <button onClick={() => setActiveTab('unidades')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'unidades' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>🏢 Cadastrar Agente ({unidades.length})</button>
            <button onClick={() => setActiveTab('config_custos')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'config_custos' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>💲 Matriz Custos</button>
            <button onClick={() => setActiveTab('config_mtr')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'config_mtr' ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>⚙️ Conectores MTR</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
        
        {/* ABA: BASE ANP NATIVA DENTRO DO LUBELOOP */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fadeIn">
            
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <LubeLoopLogo className="w-12 h-12" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold mb-1">
                    ✓ Registros Regulados ANP Sincronizados na LubeLoop
                  </div>
                  <h2 className="text-2xl font-black text-white">Consulta Integrada de Agentes Autorizados</h2>
                  <p className="text-xs text-slate-400">Relação direta de Coletores, Bases de Transbordo e Usinas de Rerrefino homologadas.</p>
                </div>
              </div>

              <div className="w-full md:w-72">
                <input 
                  type="text"
                  placeholder="🔍 Pesquisar por Razão, CNPJ ou Nº ANP..."
                  value={buscaAnp}
                  onChange={e => setBuscaAnp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>🏛️</span> Agentes Regulados Outorgados
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Exibição dos dados autorizativos diretamente no sistema LubeLoop.</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setFiltroTipoDashboard('todos')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filtroTipoDashboard === 'todos' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    Todos ({unidades.length})
                  </button>
                  <button
                    onClick={() => setFiltroTipoDashboard('transbordo')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filtroTipoDashboard === 'transbordo' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    Coletores / Bases ({unidades.filter(u => u.tipo === 'transbordo').length})
                  </button>
                  <button
                    onClick={() => setFiltroTipoDashboard('rerrefino')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filtroTipoDashboard === 'rerrefino' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Rerrefinadores ({unidades.filter(u => u.tipo === 'rerrefino').length})
                  </button>
                </div>
              </div>

              {agentesFiltradosDashboard.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl space-y-2">
                  <p>Nenhum agente regulado encontrado para a pesquisa.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-4">Atividade Regulada</th>
                        <th className="p-4">Razão Social / Fantasia</th>
                        <th className="p-4">Nº Autorização ANP (SIMP)</th>
                        <th className="p-4">Licença Ambiental (LO)</th>
                        <th className="p-4">Localização da Instalação</th>
                        <th className="p-4 text-center">Status LubeLoop / ANP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {agentesFiltradosDashboard.map((u, i) => (
                        <tr key={u.id || i} className="hover:bg-slate-800/40 transition">
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${u.tipo === 'transbordo' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' : 'bg-purple-500/10 text-purple-300 border border-purple-500/30'}`}>
                              {u.tipo === 'transbordo' ? 'Coletor / Base Transbordo' : 'Usina de Rerrefino'}
                            </span>
                          </td>
                          <td className="p-4 font-sans font-bold text-white">
                            {u.nome_fantasia || u.razao_social}
                            <span className="block text-[11px] font-mono text-slate-400 font-normal mt-0.5">{u.cnpj}</span>
                          </td>
                          <td className="p-4 text-emerald-400 font-bold">
                            {u.autorizacao_anp || 'ANP-SIMP-REGULADO'}
                          </td>
                          <td className="p-4 text-slate-200">
                            {u.licenca_operacao}
                            <span className="block text-[10px] text-slate-400 font-normal">Órgão: {u.orgao_ambiental}</span>
                          </td>
                          <td className="p-4 font-sans text-slate-300">
                            <span className="font-bold text-white block">{u.cidade} / {u.estado}</span>
                            <span className="text-[10px] text-slate-400">{u.endereco}</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="text-[10px] font-bold px-3 py-1 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                              ✓ {u.situacao_anp || 'AUTORIZADO'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        )}

        {/* MATRIZ DE CUSTOS & SIMULADOR */}
        {activeTab === 'config_custos' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-black text-amber-400 flex items-center gap-2">
                    <span>⚡</span> Simulador de Cenários de Impacto (Diesel & CCT)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Simule variações de custo sem alterar a estrutura comercial do gerador.</p>
                </div>
                <button onClick={() => setSimuladorCenario({ aumentoDieselPct: 0, aumentoCctPct: 0 })} className="bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-xl hover:bg-slate-700">
                  Resetar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-amber-400">Aumento no Óleo Diesel:</span>
                    <span className="text-white font-mono text-sm">+{simuladorCenario.aumentoDieselPct}%</span>
                  </div>
                  <input type="range" min="0" max="50" step="1" value={simuladorCenario.aumentoDieselPct} onChange={e => setSimuladorCenario({ ...simuladorCenario, aumentoDieselPct: Number(e.target.value) })} className="w-full accent-amber-400 cursor-pointer" />
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-rose-400">Aumento na CCT / Periculosidade:</span>
                    <span className="text-white font-mono text-sm">+{simuladorCenario.aumentoCctPct}%</span>
                  </div>
                  <input type="range" min="0" max="30" step="1" value={simuladorCenario.aumentoCctPct} onChange={e => setSimuladorCenario({ ...simuladorCenario, aumentoCctPct: Number(e.target.value) })} className="w-full accent-rose-400 cursor-pointer" />
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-black text-white">💲 Matriz de Custos Global (Supabase)</h2>
                <button onClick={salvarCustosSupabase} disabled={salvandoCustos} className="bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black px-5 py-3 rounded-xl text-xs">
                  {salvandoCustos ? 'Salvando...' : '💾 Sincronizar Custos'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Preço Balcão Usina</label>
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
            </div>
          </div>
        )}

        {/* CADASTRO DE AGENTES */}
        {activeTab === 'unidades' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
              <h2 className="text-2xl font-black text-white mb-6">🏢 Cadastrar Novo Agente Regulado na LubeLoop</h2>
              <form onSubmit={handleSalvarUnidade} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Atividade ANP</label>
                    <select value={novaUnidade.tipo} onChange={e => setNovaUnidade({...novaUnidade, tipo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                      <option value="transbordo">Coletor / Armazenador Temporário (Base Transbordo)</option>
                      <option value="rerrefino">Rerrefinador Outorgado (Destinação Final)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">CNPJ</label>
                    <input type="text" required value={novaUnidade.cnpj} onChange={handleCnpjUnidadeChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Razão Social</label>
                    <input type="text" required value={novaUnidade.razao_social} onChange={e => setNovaUnidade({...novaUnidade, razao_social: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Nº Autorização ANP (SIMP)</label>
                    <input type="text" required value={novaUnidade.autorizacao_anp} onChange={e => setNovaUnidade({...novaUnidade, autorizacao_anp: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Licença de Operação (LO)</label>
                    <input type="text" required value={novaUnidade.licenca_operacao} onChange={e => setNovaUnidade({...novaUnidade, licenca_operacao: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Cidade / UF</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={novaUnidade.cidade} onChange={e => setNovaUnidade({...novaUnidade, cidade: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                      <input type="text" value={novaUnidade.estado} onChange={e => setNovaUnidade({...novaUnidade, estado: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase" />
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full bg-indigo-500 text-white font-black py-3 rounded-xl text-xs uppercase">
                  + Salvar Agente na Base LubeLoop
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SOLICITAÇÃO DE COLETA */}
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

                <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/30 space-y-2 font-mono text-xs">
                  <div className="flex justify-between font-bold text-white border-b border-slate-800 pb-2">
                    <span>DRE Reativa por Litro</span>
                    <span className="text-emerald-400">Teto Recomendado: R$ {breakdownAtual.tetoSugerido} / L</span>
                  </div>
                  <div className="flex justify-between text-slate-400"><span>Preço Balcão Usina:</span><span className="text-emerald-400">+ R$ {breakdownAtual.precoBrutoRerrefino}</span></div>
                  <div className="flex justify-between text-slate-400"><span>Mão de Obra CCT ({novaColeta.estado}):</span><span className="text-rose-400">- R$ {breakdownAtual.custoMaoDeObraMotorista}</span></div>
                  <div className="flex justify-between text-slate-400"><span>Coleta Capilar:</span><span className="text-amber-400">- R$ {breakdownAtual.custoDieselPneusMaint}</span></div>
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black py-4 rounded-2xl text-xs uppercase">
                  ✓ Enviar Solicitação para Cotação
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MTRS E COLETAS */}
        {activeTab === 'config_mtr' && (
          <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-xl font-black text-white mb-4">⚙️ Conectores MTR Estaduais vs SINIR</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(sistemasMtrEstaduais).map(([uf, info]) => (
                <div key={uf} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-white font-mono">{uf}</span> - <span className="text-xs text-slate-300">{info.nome}</span>
                  </div>
                  <button onClick={() => toggleSistemaEstado(uf)} className="px-3 py-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold">
                    {info.ativo ? 'Estadual Próprio' : 'SINIR'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
