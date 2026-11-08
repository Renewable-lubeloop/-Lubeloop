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

  // Controle de Senha para Matriz de Custos
  const [senhaMatriz, setSenhaMatriz] = useState('')
  const [matrizLiberada, setMatrizLiberada] = useState(false)
  const SENHA_ADMIN = 'biopetro2026'

  // SIMULADOR DE CENÁRIOS (STRESS TEST)
  const [simuladorCenario, setSimuladorCenario] = useState({
    aumentoDieselPct: 0,
    aumentoCctPct: 0
  })

  // MATRIZ DINÂMICA DE CUSTOS
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

  // DRE CALCULADA SILENCIOSAMENTE NOS BASTIDORES
  const [breakdownAtual, setBreakdownAtual] = useState({
    tetoSugerido: '1.51'
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

  const buscarUnidades = async () => {
    if (!supabase) return
    try {
      const { data: anpData, error } = await supabase.from('agentes_anp').select('*').order('created_at', { ascending: false })
      if (!error && anpData && anpData.length > 0) {
        setUnidades(anpData)
      } else {
        const { data: opData } = await supabase.from('unidades_operacionais').select('*').order('created_at', { ascending: false })
        if (opData) setUnidades(opData)
      }
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

  // CÁLCULO DRE OCULTO (BASTIDORES)
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

  const handleCnpjUnidadeChange = async (e) => {
    const doc = e.target.value
    setNovaUnidade(prev => ({ ...prev, cnpj: doc }))
    const docLimpo = doc.replace(/\D/g, '')

    if (docLimpo.length === 14) {
      setBuscandoDocUnidade(true)
      try {
        const res = await fetch(`https://publica.cnpj.ws/cnpj/${docLimpo}`)
        if (res.ok) {
          const json = await res.json()
          const est = json.estabelecimento || {}
          setNovaUnidade(prev => ({
            ...prev,
            razao_social: json.razao_social || '',
            nome_fantasia: est.nome_fantasia || json.razao_social || ''
          }))
        }
      } finally { setBuscandoDocUnidade(false) }
    }
  }

  const handleSalvarUnidade = async (e) => {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    try {
      await supabase.from('agentes_anp').insert([novaUnidade])
      alert("Agente regulado cadastrado com sucesso!")
      buscarUnidades()
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

  const agentesFiltradosDashboard = unidades.filter(u => {
    const matchTipo = filtroTipoDashboard === 'todos' || u.tipo === filtroTipoDashboard
    const termo = buscaAnp.toLowerCase().trim()
    if (!termo) return matchTipo

    return matchTipo && (
      (u.razao_social || '').toLowerCase().includes(termo) ||
      (u.nome_fantasia || '').toLowerCase().includes(termo) ||
      (u.cnpj || '').includes(termo) ||
      (u.autorizacao_anp || '').toLowerCase().includes(termo) ||
      (u.cidade || '').toLowerCase().includes(termo) ||
      (u.estado || '').toLowerCase().includes(termo)
    )
  })

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <LubeLoopLogo className="w-11 h-11" />
            <div>
              <h1 className="text-2xl font-black text-white">Lube<span className="text-emerald-400">Loop</span></h1>
              <p className="text-xs text-slate-400">Plataforma Neutra de Gestão & Compliance de OLUC</p>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80">
            <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'dashboard' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>📊 Painel ANP</button>
            <button onClick={() => setActiveTab('solicitar')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'solicitar' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>⚡ Nova Coleta</button>
            <button onClick={() => setActiveTab('coletas')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'coletas' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>🚛 Ordens ({coletas.length})</button>
            <button onClick={() => setActiveTab('unidades')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'unidades' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>🏢 Cadastrar Agente</button>
            <button onClick={() => setActiveTab('config_custos')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'config_custos' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>💲 Matriz Custos</button>
            <button onClick={() => setActiveTab('config_mtr')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'config_mtr' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>⚙️ MTRs</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
        
        {/* DASHBOARD COM KPIS EM DESTAQUE NO TOPO */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <span className="text-xs font-bold text-slate-400 uppercase">Volume em Cotação</span>
                <h3 className="text-3xl font-black text-white mt-2">{coletas.reduce((acc, item) => acc + (Number(item.volume_estimado_litros) || 0), 0).toLocaleString()} <span className="text-sm text-emerald-400">Litros</span></h3>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <span className="text-xs font-bold text-slate-400 uppercase">Agentes ANP Ativos</span>
                <h3 className="text-3xl font-black text-indigo-400 mt-2">{unidades.length} <span className="text-sm text-slate-400">Homologados</span></h3>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <span className="text-xs font-bold text-slate-400 uppercase">Armazenamento</span>
                <h3 className="text-3xl font-black text-cyan-400 mt-2">{unidades.filter(u => u.tipo === 'transbordo').length} <span className="text-sm text-slate-400">Bases</span></h3>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <span className="text-xs font-bold text-slate-400 uppercase">Usinas Rerrefino</span>
                <h3 className="text-3xl font-black text-purple-400 mt-2">{unidades.filter(u => u.tipo === 'rerrefino').length} <span className="text-sm text-slate-400">Usinas</span></h3>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="text-xl font-black text-white">Relação de Agentes Regulados Autorizados</h3>
                <input 
                  type="text" placeholder="🔍 Pesquisar na base ANP..." value={buscaAnp} onChange={e => setBuscaAnp(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Atividade</th>
                      <th className="p-3">Empresa / Razão Social</th>
                      <th className="p-3">Autorização ANP</th>
                      <th className="p-3">Licença (LO)</th>
                      <th className="p-3">Localidade</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {agentesFiltradosDashboard.map((u, i) => (
                      <tr key={u.id || i} className="hover:bg-slate-800/40">
                        <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.tipo === 'transbordo' ? 'bg-cyan-500/10 text-cyan-300' : 'bg-purple-500/10 text-purple-300'}`}>{u.tipo === 'transbordo' ? 'Base Transbordo' : 'Rerrefino'}</span></td>
                        <td className="p-3 font-sans font-bold text-white">{u.nome_fantasia || u.razao_social}<span className="block text-[10px] text-slate-400">{u.cnpj}</span></td>
                        <td className="p-3 text-emerald-400 font-bold">{u.autorizacao_anp}</td>
                        <td className="p-3 text-slate-200">{u.licenca_operacao}</td>
                        <td className="p-3 font-sans">{u.cidade} / {u.estado}</td>
                        <td className="p-3 text-center"><span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">AUTORIZADO</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* NOVA SOLICITAÇÃO (DRE OCULTA) */}
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

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>Validação Econômica de Rota Aplicada nos Bastidores</span>
                  <span className="text-emerald-400 font-mono font-bold">Teto Automático Ativo</span>
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black py-4 rounded-2xl text-xs uppercase tracking-wider">
                  ✓ Enviar Solicitação para Cotação
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MATRIZ DE CUSTOS PROTEGIDA POR SENHA */}
        {activeTab === 'config_custos' && (
          <div className="max-w-5xl mx-auto space-y-8">
            {!matrizLiberada ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md mx-auto text-center space-y-6 shadow-2xl">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl mx-auto flex items-center justify-center text-xl font-bold border border-amber-500/30">
                  🔒
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Área Restrita — Matriz de Custos</h3>
                  <p className="text-xs text-slate-400 mt-1">Digite a senha de administrador para acessar os parâmetros.</p>
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

        {/* OUTRAS ABAS */}
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

        {activeTab === 'unidades' && (
          <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-black text-white">🏢 Cadastrar Agente ANP</h2>
            <form onSubmit={handleSalvarUnidade} className="space-y-3">
              <input type="text" placeholder="CNPJ" value={novaUnidade.cnpj} onChange={handleCnpjUnidadeChange} className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-white rounded" required />
              <input type="text" placeholder="Razão Social" value={novaUnidade.razao_social} onChange={e => setNovaUnidade({...novaUnidade, razao_social: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-white rounded" required />
              <button type="submit" className="bg-indigo-500 text-white font-black px-4 py-2 rounded text-xs">Cadastrar</button>
            </form>
          </div>
        )}

        {activeTab === 'config_mtr' && (
          <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-xl font-black text-white mb-4">⚙️ Conectores MTR</h2>
            {Object.entries(sistemasMtrEstaduais).map(([uf, info]) => (
              <div key={uf} className="bg-slate-950 p-3 rounded-xl mb-2 flex justify-between items-center border border-slate-800">
                <span className="font-bold text-white text-xs">{uf} - {info.nome}</span>
                <button onClick={() => toggleSistemaEstado(uf)} className="px-3 py-1 bg-cyan-500/10 text-cyan-300 rounded text-xs font-bold">
                  {info.ativo ? 'Estadual Próprio' : 'SINIR'}
                </button>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  )
}
