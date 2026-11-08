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

  // MATRIZ DINÂMICA DE PARAMETRIZAÇÃO DE CUSTOS DA DRE
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

  // Mapeamento Dinâmico de Sistemas de MTR por Estado
  const [sistemasMtrEstaduais, setSistemasMtrEstaduais] = useState({
    'ES': { nome: 'MTR-ES / IEMA', tipo: 'Estadual Próprio (IN 012-N/2022)', ativo: true, tokenConfigurado: true },
    'RJ': { nome: 'MTR-INEA (RJ)', tipo: 'Estadual Próprio', ativo: true, tokenConfigurado: true },
    'MG': { nome: 'MTR-FEAM (MG)', tipo: 'Estadual Próprio', ativo: true, tokenConfigurado: true },
    'SP': { nome: 'SIGOR / CETESB (SP)', tipo: 'Estadual Próprio', ativo: true, tokenConfigurado: true },
    'PR': { nome: 'MTR-IAT (PR)', tipo: 'Estadual Próprio', ativo: true, tokenConfigurado: false },
    'SC': { nome: 'MTR-IMA (SC)', tipo: 'Estadual Próprio', ativo: true, tokenConfigurado: false },
    'RS': { nome: 'MTR-FEPAM (RS)', tipo: 'Estadual Próprio', ativo: true, tokenConfigurado: false },
    'BA': { nome: 'MTR-INEMA (BA)', tipo: 'Estadual Próprio', ativo: true, tokenConfigurado: false }
  })

  // Estado do Formulário de Nova Solicitação de Coleta
  const [novaColeta, setNovaColeta] = useState({
    gerador: '', cnpj: '', inscricao_estadual: '', licenca_operacao: 'LO-AMB 4859/2026', lo_valida: true,
    volume_estimado: '', valor_esperado: '', cotacao_aberta: true, requer_balsa: false, tem_transbordo: true,
    estado_base_transbordo: 'ES', estado_destinacao_final: 'SP', endereco: '', cidade: 'Vitória', estado: 'ES'
  })

  // Estado da DRE Calculada em Tempo Real
  const [breakdownAtual, setBreakdownAtual] = useState({
    precoBrutoRerrefino: '2.40', custoMaoDeObraMotorista: '0.23', custoDieselPneusMaint: '0.26',
    custoFreteTransbordo: '0.22', custosAdministrativos: '0.18', custoBalsa: '0.00', deducoesTotais: '0.89',
    tetoSugerido: '1.51', faixaTexto: 'R$ 1.13 a R$ 1.51 / L', nomeUsinaProxima: 'Base Transbordo ➔ Usina Rerrefino', nomeZona: 'Rota Terrestre Regular'
  })

  // Estado do Formulário de Cadastro de Unidades Operacionais (ANP)
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

  // CÁLCULO DRE COM SIMULADOR DE IMPACTO DE DIESEL E CCT
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

    let nomeZona = 'Rota Terrestre Regular'
    if (uf === 'ES' && cidadesHub.includes(cid)) nomeZona = 'Hub Direto (Baixo Frete)'
    if (requerBalsa) nomeZona += ' + Travessia Balsa'

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
      nomeUsinaProxima,
      nomeZona
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
          const uf = est.estado?.sigla || 'ES'
          
          let orgao = 'IEMA'
          if (uf === 'SP') orgao = 'CETESB'
          else if (uf === 'RJ') orgao = 'INEA'
          else if (uf === 'MG') orgao = 'FEAM'
          else if (uf === 'PR') orgao = 'IAT'

          setNovaUnidade(prev => ({
            ...prev,
            razao_social: json.razao_social || '',
            nome_fantasia: est.nome_fantasia || json.razao_social || '',
            inscricao_estadual: est.inscricoes_estaduais?.[0]?.inscricao_estadual || 'Isento',
            orgao_ambiental: orgao,
            endereco: `${est.logradouro || ''}, ${est.numero || 'S/N'}`,
            bairro: est.bairro || '',
            cidade: est.cidade?.nome || '',
            estado: uf
          }))
        }
      } catch (err) {
        console.error("Erro ao buscar CNPJ da unidade:", err)
      } finally {
        setBuscandoDocUnidade(false)
      }
    }
  }

  const handleSalvarUnidade = async (e) => {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    try {
      const { error } = await supabase.from('agentes_anp').insert([novaUnidade])
      if (!error) {
        alert("Agente Regulado cadastrado na base nativa LubeLoop!")
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

  const getGoogleMapsUrl = (endereco, cidade, estado) => {
    const destino = encodeURIComponent(`${endereco}, ${cidade} - ${estado}`)
    return `https://www.google.com/maps/dir/?api=1&destination=${destino}`
  }

  const getAppleMapsUrl = (endereco, cidade, estado) => {
    const destino = encodeURIComponent(`${endereco}, ${cidade} - ${estado}`)
    return `https://maps.apple.com/?daddr=${destino}`
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
      
      {/* Luzes de fundo */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Superior LubeLoop */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
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
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                  Gestão Logística & Base ANP
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Plataforma Neutra de Gestão & Compliance de OLUC</p>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg scale-105' : 'text-slate-400 hover:text-white'}`}
            >
              📊 Painel
            </button>
            <button 
              onClick={() => setActiveTab('solicitar')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'solicitar' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg scale-105' : 'text-slate-400 hover:text-white'}`}
            >
              ⚡ Nova Coleta
            </button>
            <button 
              onClick={() => setActiveTab('coletas')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'coletas' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg scale-105' : 'text-slate-400 hover:text-white'}`}
            >
              🚛 Ordens ({coletas.length})
            </button>
            <button 
              onClick={() => setActiveTab('unidades')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'unidades' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-white'}`}
            >
              🏢 Cadastrar Agente ({unidades.length})
            </button>
            <button 
              onClick={() => setActiveTab('config_custos')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'config_custos' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg scale-105' : 'text-slate-400 hover:text-white'}`}
            >
              💲 Matriz Custos
            </button>
            <button 
              onClick={() => setActiveTab('config_mtr')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'config_mtr' ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-lg scale-105' : 'text-slate-400 hover:text-white'}`}
            >
              ⚙️ Conectores MTR
            </button>
          </nav>

        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto relative z-10">
        
        {/* ABA: DASHBOARD / TELA PRINCIPAL COM KPIS EM DESTAQUE */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* CARD BANNER PRINCIPAL */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 rounded-3xl p-8 shadow-2xl">
              <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                
                <div className="flex items-center gap-6">
                  <div className="p-4 rounded-3xl bg-slate-950/80 border border-slate-800/80 shadow-2xl shadow-emerald-500/20 shrink-0">
                    <LubeLoopLogo className="w-20 h-20" glow={true} />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2">
                      🏛️ Base Integrada LubeLoop de Agentes Regulados ANP
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tight">
                      LubeLoop <span className="text-emerald-400">Portal de Agentes Autorizados</span>
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed mt-1 max-w-xl">
                      Consulta nativa e acompanhamento em tempo real dos coletores, armazenadores temporários (transbordo) e usinas de rerrefino cadastrados no sistema.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                  <button 
                    onClick={() => setActiveTab('solicitar')}
                    className="bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 px-6 py-4 rounded-2xl font-black transition-all transform hover:scale-105 shadow-xl shadow-emerald-500/20 whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    <span>+ Criar Solicitação de Coleta</span>
                  </button>
                </div>
              </div>
            </div>

            {/* CARTÕES DE KPIS EM DESTAQUE NO TOPO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="relative group bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-emerald-500/50 transition shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume em Cotação</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">🛢️</div>
                </div>
                <h3 className="text-3xl font-black text-white tracking-tight">
                  {coletas.reduce((acc, item) => acc + (Number(item.volume_estimado_litros) || 0), 0).toLocaleString()} <span className="text-sm font-bold text-emerald-400">Litros</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">Ordens registradas no sistema</p>
              </div>

              <div className="relative group bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-indigo-500/50 transition shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Agentes ANP Ativos</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">🏢</div>
                </div>
                <h3 className="text-3xl font-black text-indigo-400 tracking-tight">
                  {unidades.length} <span className="text-sm font-bold text-slate-400">Homologados</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">Bases & Usinas de Rerrefino</p>
              </div>

              <div className="relative group bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-cyan-500/50 transition shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Armazenamento Temporário</span>
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">🚚</div>
                </div>
                <h3 className="text-3xl font-black text-cyan-400 tracking-tight">
                  {unidades.filter(u => u.tipo === 'transbordo').length} <span className="text-sm font-bold text-slate-400">Bases</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">Entrepostos de transbordo</p>
              </div>

              <div className="relative group bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-purple-500/50 transition shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Usina Rerrefino</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">⚙️</div>
                </div>
                <h3 className="text-3xl font-black text-purple-400 tracking-tight">
                  {unidades.filter(u => u.tipo === 'rerrefino').length} <span className="text-sm font-bold text-slate-400">Usinas</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">Destinação Final Outorgada</p>
              </div>
            </div>

            {/* TABELA DE AGENTES ANP NATIVA */}
            <div className="bg-slate-900/70 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>🏛️</span> Relação Completa de Agentes Regulados Autorizados
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Consulta local direta dos coletores, armazenadores temporários e rerrefinadores ativos no LubeLoop.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <input 
                    type="text"
                    placeholder="🔍 Pesquisar por Razão, CNPJ ou Nº ANP..."
                    value={buscaAnp}
                    onChange={e => setBuscaAnp(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />

                  <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
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
                      Bases ({unidades.filter(u => u.tipo === 'transbordo').length})
                    </button>
                    <button
                      onClick={() => setFiltroTipoDashboard('rerrefino')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filtroTipoDashboard === 'rerrefino' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      Usinas ({unidades.filter(u => u.tipo === 'rerrefino').length})
                    </button>
                  </div>
                </div>
              </div>

              {agentesFiltradosDashboard.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl space-y-3">
                  <p>Nenhum agente regulado encontrado no banco de dados.</p>
                  <button 
                    onClick={() => setActiveTab('unidades')}
                    className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-500/30 transition"
                  >
                    + Cadastrar Agente ANP
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-4">Atividade Regulada</th>
                        <th className="p-4">Empresa / Razão Social</th>
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
                              {u.tipo === 'transbordo' ? 'Coletor / Base Transbordo' : 'Rerrefinador Outorgado'}
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

        {/* ABA: PAINEL DE CONFIGURAÇÃO DINÂMICA DE CUSTOS DA DRE + SIMULADOR */}
        {activeTab === 'config_custos' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
            
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
                  className="bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-xl hover:bg-slate-700 transition"
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
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>💲</span> Matriz de Custos Sincronizada (Supabase)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Edite em tempo real os custos de diesel, folha/periculosidade CCT por estado e frete de transbordo.
                  </p>
                </div>
                <button 
                  onClick={salvarCustosSupabase}
                  disabled={salvandoCustos}
                  className="bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 text-slate-950 font-black px-5 py-3 rounded-xl text-xs shadow-lg transition"
                >
                  {salvandoCustos ? 'Salvando...' : '💾 Sincronizar no Supabase'}
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span>⚙️</span> Parâmetros Globais de Operação & Balcão (R$/Litro)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Preço Balcão (Usina Rerrefino)
                      </label>
                      <input 
                        type="number" step="0.01"
                        value={parametrosCustos.precoBrutoBalcaoUsina}
                        onChange={e => setParametrosCustos({
                          ...parametrosCustos, 
                          precoBrutoBalcaoUsina: parseFloat(e.target.value) || 0
                        })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono font-bold focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Coleta Capilar (Diesel/Pneus)
                      </label>
                      <input 
                        type="number" step="0.01"
                        value={parametrosCustos.custoCapilarDieselPneusBase}
                        onChange={e => setParametrosCustos({
                          ...parametrosCustos, 
                          custoCapilarDieselPneusBase: parseFloat(e.target.value) || 0
                        })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-amber-400 font-mono font-bold focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Administrativo / Telemetria
                      </label>
                      <input 
                        type="number" step="0.01"
                        value={parametrosCustos.custosAdministrativosTelemetria}
                        onChange={e => setParametrosCustos({
                          ...parametrosCustos, 
                          custosAdministrativosTelemetria: parseFloat(e.target.value) || 0
                        })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-purple-400 font-mono font-bold focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Taxa Balsa HAZMAT / Fluvial
                      </label>
                      <input 
                        type="number" step="0.01"
                        value={parametrosCustos.custoBalsaFlutuanteHazmat}
                        onChange={e => setParametrosCustos({
                          ...parametrosCustos, 
                          custoBalsaFlutuanteHazmat: parseFloat(e.target.value) || 0
                        })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-cyan-400 font-mono font-bold focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span>🚛</span> Mão de Obra, Periculosidade 30% & CCT por UF (R$/L)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Object.entries(parametrosCustos.custoMaoDeObraCCTPorUF).map(([uf, valor]) => (
                      <div key={uf} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                        <span className="font-extrabold text-white font-mono text-sm">{uf}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400 font-mono">R$</span>
                          <input 
                            type="number" step="0.01"
                            value={valor}
                            onChange={e => setParametrosCustos({
                              ...parametrosCustos,
                              custoMaoDeObraCCTPorUF: {
                                ...parametrosCustos.custoMaoDeObraCCTPorUF,
                                [uf]: parseFloat(e.target.value) || 0
                              }
                            })}
                            className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-rose-400 font-mono font-bold text-right focus:border-rose-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span>🔄</span> Matriz de Frete de Transbordo (Base ➔ Usina)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {Object.entries(parametrosCustos.custoFreteTransbordoMatriz).map(([rota, valor]) => (
                      <div key={rota} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-white font-mono text-xs block">
                            {rota === 'DEFAULT' ? 'Outras Rotas (Padrão)' : `Trecho ${rota}`}
                          </span>
                          <span className="text-[10px] text-slate-500">Transferência de Entreposto</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400 font-mono">R$</span>
                          <input 
                            type="number" step="0.01"
                            value={valor}
                            onChange={e => setParametrosCustos({
                              ...parametrosCustos,
                              custoFreteTransbordoMatriz: {
                                ...parametrosCustos.custoFreteTransbordoMatriz,
                                [rota]: parseFloat(e.target.value) || 0
                              }
                            })}
                            className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-cyan-400 font-mono font-bold text-right focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ABA: GESTÃO E CADASTRO DE UNIDADES OPERACIONAIS / AGENTES ANP */}
        {activeTab === 'unidades' && (
          <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
            
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 md:p-8 shadow-2xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>🏢</span> Cadastrar Novo Agente Regulado na LubeLoop
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Insira bases de armazenamento temporário (transbordo) e rerrefinadores na base nativa da LubeLoop.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSalvarUnidade} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Tipo de Atividade ANP
                    </label>
                    <select
                      value={novaUnidade.tipo}
                      onChange={e => setNovaUnidade({...novaUnidade, tipo: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none font-bold"
                    >
                      <option value="transbordo">Coletor / Armazenador Temporário (Base Transbordo)</option>
                      <option value="rerrefino">Rerrefinador Outorgado (Destinação Final)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>CNPJ da Empresa</span>
                      {buscandoDocUnidade && <span className="text-indigo-400 animate-pulse text-[10px]">🔍 Consultando...</span>}
                    </label>
                    <input 
                      type="text" required
                      placeholder="00.000.000/0000-00"
                      value={novaUnidade.cnpj}
                      onChange={handleCnpjUnidadeChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Razão Social
                    </label>
                    <input 
                      type="text" required
                      placeholder="Razão Social completa"
                      value={novaUnidade.razao_social}
                      onChange={e => setNovaUnidade({...novaUnidade, razao_social: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Nome Fantasia / Unidade
                    </label>
                    <input 
                      type="text"
                      placeholder="Ex: Base Regional / Usina Polo"
                      value={novaUnidade.nome_fantasia}
                      onChange={e => setNovaUnidade({...novaUnidade, nome_fantasia: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Nº Autorização ANP (SIMP)
                    </label>
                    <input 
                      type="text" required
                      placeholder="Ex: ANP-SIMP-0412"
                      value={novaUnidade.autorizacao_anp}
                      onChange={e => setNovaUnidade({...novaUnidade, autorizacao_anp: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Situação / Status ANP
                    </label>
                    <select
                      value={novaUnidade.situacao_anp}
                      onChange={e => setNovaUnidade({...novaUnidade, situacao_anp: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-emerald-400 font-mono font-bold focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="AUTORIZADO">✓ AUTORIZADO (Ativo)</option>
                      <option value="EM_ANALISE">⏳ EM ANÁLISE REVISIONAL</option>
                      <option value="SUSPENSO">❌ CANCELADO / SUSPENSO</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Licença de Operação (LO)
                    </label>
                    <input 
                      type="text" required
                      placeholder="Ex: LO-AMB 4859/2026"
                      value={novaUnidade.licenca_operacao}
                      onChange={e => setNovaUnidade({...novaUnidade, licenca_operacao: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Endereço da Instalação / Base
                    </label>
                    <input 
                      type="text" required
                      placeholder="Rua, Número, Bairro"
                      value={novaUnidade.endereco}
                      onChange={e => setNovaUnidade({...novaUnidade, endereco: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Cidade</label>
                      <input 
                        type="text" required
                        value={novaUnidade.cidade}
                        onChange={e => setNovaUnidade({...novaUnidade, cidade: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Estado (UF)</label>
                      <input 
                        type="text" required
                        value={novaUnidade.estado}
                        onChange={e => setNovaUnidade({...novaUnidade, estado: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white uppercase focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading || buscandoDocUnidade}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black py-3.5 rounded-xl transition shadow-lg text-xs uppercase tracking-wider"
                >
                  + Cadastrar Agente Regulado na Base LubeLoop
                </button>

              </form>
            </div>

          </div>
        )}

        {/* ABA: CONFIGURAÇÃO DE MTRS ESTADUAIS */}
        {activeTab === 'config_mtr' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>⚙️</span> Roteador Dinâmico de MTRs Estaduais vs SINIR
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Ative os conectores por estado para migrar o roteamento de MTRs automaticamente sem alterar o código-fonte.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(sistemasMtrEstaduais).map(([uf, info]) => (
                  <div key={uf} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white font-mono text-sm">{uf}</span>
                        <span className="text-xs font-bold text-slate-300">{info.nome}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">{info.tipo}</span>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${info.tokenConfigurado ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
                          {info.tokenConfigurado ? '✓ Token API Conectado' : '⚠️ Token API Pendente'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleSistemaEstado(uf)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${info.ativo ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                    >
                      {info.ativo ? 'Estadual Próprio' : 'SINIR Nacional'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA: FORMULÁRIO DE NOVA SOLICITAÇÃO DE COLETA */}
        {activeTab === 'solicitar' && (
          <div className="max-w-3xl mx-auto animate-fadeIn">
            <div className="bg-slate-900/70 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
              
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <LubeLoopLogo className="w-10 h-10" />
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Nova Solicitação de Coleta</h2>
                    <p className="text-xs text-slate-400 mt-0.5">DRE Logística & Viabilidade Comercial de Rota.</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCriarSolicitacao} className="space-y-6">
                
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 focus-within:border-emerald-500/80 transition">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>CPF (11 dígitos) ou CNPJ (14 dígitos)</span>
                    {buscandoDoc && <span className="text-emerald-400 animate-pulse font-semibold text-xs">🔍 Consultando dados na Receita/Sintegra...</span>}
                  </label>
                  <input 
                    type="text" required
                    placeholder="Digite os números do CPF ou CNPJ"
                    value={novaColeta.cnpj}
                    onChange={handleDocumentoChange}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-base font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Razão Social / Nome do Gerador
                    </label>
                    <input 
                      type="text" required
                      placeholder="Preenchido automaticamente"
                      value={novaColeta.gerador}
                      onChange={e => setNovaColeta({...novaColeta, gerador: e.target.value})}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Inscrição Estadual (Sintegra)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Automático para CNPJ / Isento para CPF"
                      value={novaColeta.inscricao_estadual}
                      onChange={e => setNovaColeta({...novaColeta, inscricao_estadual: e.target.value})}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Endereço Completo de Coleta
                    </label>
                    <input 
                      type="text" required
                      placeholder="Rua, Número, Bairro"
                      value={novaColeta.endereco}
                      onChange={e => setNovaColeta({...novaColeta, endereco: e.target.value})}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cidade</label>
                      <input 
                        type="text" 
                        value={novaColeta.cidade}
                        onChange={e => setNovaColeta({...novaColeta, cidade: e.target.value})}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estado (UF)</label>
                      <input 
                        type="text" 
                        value={novaColeta.estado}
                        onChange={e => setNovaColeta({...novaColeta, estado: e.target.value})}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white uppercase focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* DRE OPERACIONAL EXIBIDA EM TEMPO REAL */}
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 rounded-2xl border border-emerald-500/30 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      DRE Operacional por Litro ({novaColeta.estado || 'ES'})
                    </h4>
                    <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                      Faixa: {breakdownAtual.faixaTexto}
                    </span>
                  </div>

                  <div className="space-y-2.5 font-mono text-xs">
                    <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-300">Preço Bruto de Balcão (Usina Rerrefino)</span>
                      <span className="text-emerald-400 font-bold">+ R$ {breakdownAtual.precoBrutoRerrefino} / L</span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Mão de Obra Motorista + Periculosidade 30% + CCT ({novaColeta.estado || 'ES'})</span>
                      <span className="text-rose-400 font-bold">- R$ {breakdownAtual.custoMaoDeObraMotorista} / L</span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Coleta Capilar Local (Diesel S10, Pneus e Manutenção)</span>
                      <span className="text-amber-400 font-bold">- R$ {breakdownAtual.custoDieselPneusMaint} / L</span>
                    </div>

                    {novaColeta.tem_transbordo && (
                      <div className="flex justify-between items-center bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-500/30">
                        <span className="text-cyan-300 font-bold">Frete Transbordo: {breakdownAtual.nomeUsinaProxima}</span>
                        <span className="text-cyan-300 font-bold">- R$ {breakdownAtual.custoFreteTransbordo} / L</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/40 text-sm mt-3">
                      <span className="text-white font-bold">Valor Líquido Sustentável ao Gerador</span>
                      <span className="text-emerald-300 font-black text-base">R$ {breakdownAtual.tetoSugerido} / L</span>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || buscandoDoc}
                  className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black py-4 rounded-2xl transition shadow-xl text-xs uppercase tracking-wider"
                >
                  {loading ? 'A registrar no Supabase...' : '✓ Confirmar e Enviar para Cotação'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ABA: TABELA DE COLETAS REGISTRADAS */}
        {activeTab === 'coletas' && (
          <div className="bg-slate-900/70 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 md:p-8 shadow-2xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Ordens de Coleta, MTRs & CDF</h2>
                <p className="text-xs text-slate-400 mt-0.5">Acompanhamento de volume, MTRs estaduais/SINIR e navegação GPS</p>
              </div>
              <button 
                onClick={buscarColetas}
                className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition"
              >
                ↻ Atualizar Dados
              </button>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400 text-sm font-medium animate-pulse">
                Carregando registros do banco de dados...
              </div>
            ) : coletas.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-2xl">
                Nenhuma solicitação encontrada no Supabase.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Gerador / Documento</th>
                      <th className="p-4">Volume</th>
                      <th className="p-4">Proposta (R$/L)</th>
                      <th className="p-4">Localização</th>
                      <th className="p-4 text-center">Navegação GPS</th>
                      <th className="p-4">Cadeia MTR</th>
                      <th className="p-4 text-center">Certificado (CDF)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {coletas.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-800/40 transition">
                        <td className="p-4 font-bold text-white">
                          {item.gerador_nome || 'Gerador sem nome'}
                          <span className="block text-xs font-mono font-normal text-slate-400 mt-0.5">{item.cnpj}</span>
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
                              target="_blank" rel="noopener noreferrer"
                              className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold"
                            >
                              🗺️ Google
                            </a>
                            <a 
                              href={getAppleMapsUrl(item.endereco, item.cidade, item.estado)} 
                              target="_blank" rel="noopener noreferrer"
                              className="bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold"
                            >
                              📍 Apple
                            </a>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-mono text-cyan-300 font-semibold">
                          {item.mtr_numero || 'MTR-ES / IEMA'}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setModalCdf(item)}
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-black shadow-md"
                          >
                            📄 CDF
                          </button>
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

      {/* MODAL IMPRESSÃO DO CDF */}
      {modalCdf && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl relative">
            <button onClick={() => setModalCdf(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white font-bold text-lg">✕</button>
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <LubeLoopLogo className="w-10 h-10" />
              <div>
                <h3 className="text-xl font-black text-white">Certificado de Destinação Final (CDF)</h3>
                <p className="text-xs text-slate-400">Emissão oficial integrada aos órgãos ambiental e de logística de OLUC</p>
              </div>
            </div>
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Nº do Certificado:</span>
                <span className="text-emerald-400 font-bold">CDF-2026-{(modalCdf.id || '001').toString().padStart(6, '0')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gerador:</span>
                <span className="text-white font-bold">{modalCdf.gerador_nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Volume Rerrefinado:</span>
                <span className="text-emerald-400 font-bold">{modalCdf.volume_estimado_litros} Litros</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/30">
              <span className="text-xs font-bold text-white">Autenticação digital por QR Code (IEMA/SINIR)</span>
              <button onClick={() => { alert('Iniciando PDF...'); setModalCdf(null); }} className="bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs">
                🖨️ Baixar PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
