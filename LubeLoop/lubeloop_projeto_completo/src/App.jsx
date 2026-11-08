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
  // A aba padrão agora é 'solicitar' para que a captação de receita fique em primeiro plano
  const [activeTab, setActiveTab] = useState('solicitar')
  const [coletas, setColetas] = useState([])
  const [unidades, setUnidades] = useState([])
  const [buscaAnp, setBuscaAnp] = useState('')
  const [loading, setLoading] = useState(false)
  const [buscandoDoc, setBuscandoDoc] = useState(false)
  const [buscandoDocUnidade, setBuscandoDocUnidade] = useState(false)
  const [modalCdf, setModalCdf] = useState(null)
  const [filtroTipoDashboard, setFiltroTipoDashboard] = useState('todos')
  const [filtroRegiao, setFiltroRegiao] = useState('todas')
  const [salvandoCustos, setSalvandoCustos] = useState(false)

  // Controle de Senha para Matriz de Custos
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
    tetoSugerido: '1.51'
  })

  const [novaUnidade, setNovaUnidade] = useState({
    tipo: 'transbordo', regiao: 'Sudeste', razao_social: '', nome_fantasia: '', cnpj: '', inscricao_estadual: '', licenca_operacao: '',
    orgao_ambiental: 'IEMA', autorizacao_anp: '', situacao_anp: 'AUTORIZADO', endereco: '', bairro: '',
    cidade: 'Vitória', estado: 'ES', capacidade_estocagem_litros: '50000', contato_nome: '', contato_telefone: ''
  })

  const agentesAnpPadrao = [
    { id: 1, tipo: 'transbordo', regiao: 'Sudeste', razao_social: 'Base de Apoio Logístico e Armazenamento ES', nome_fantasia: 'Entreposto Serra / ES', cnpj: '00.123.456/0001-89', autorizacao_anp: 'ANP-SIMP-ES-0412', situacao_anp: 'AUTORIZADO', licenca_operacao: 'LO-IEMA 1042/2025', orgao_ambiental: 'IEMA', cidade: 'Serra', estado: 'ES', capacidade_litros: 150000 },
    { id: 2, tipo: 'transbordo', regiao: 'Sudeste', razao_social: 'Logística Ambiental e Coleta de Óleos RJ', nome_fantasia: 'Base Duque de Caxias', cnpj: '22.333.444/0001-55', autorizacao_anp: 'ANP-SIMP-RJ-0201', situacao_anp: 'AUTORIZADO', licenca_operacao: 'LO-INEA 5011/2025', orgao_ambiental: 'INEA', cidade: 'Duque de Caxias', estado: 'RJ', capacidade_litros: 300000 },
    { id: 3, tipo: 'transbordo', regiao: 'Sudeste', razao_social: 'Minas Coleta e Transbordo de Lubrificantes', nome_fantasia: 'Base Betim / MG', cnpj: '33.444.555/0001-66', autorizacao_anp: 'ANP-SIMP-MG-0118', situacao_anp: 'AUTORIZADO', licenca_operacao: 'LO-FEAM 3302/2024', orgao_ambiental: 'FEAM', cidade: 'Betim', estado: 'MG', capacidade_litros: 200000 },
    { id: 4, tipo: 'transbordo', regiao: 'Sudeste', razao_social: 'Coleta & Transbordo Paulínia Logística', nome_fantasia: 'Base Entreposto Paulínia', cnpj: '44.555.666/0001-77', autorizacao_anp: 'ANP-SIMP-SP-0950', situacao_anp: 'AUTORIZADO', licenca_operacao: 'LO-CETESB 7712/2025', orgao_ambiental: 'CETESB', cidade: 'Paulínia', estado: 'SP', capacidade_litros: 500000 },
    { id: 5, tipo: 'rerrefino', regiao: 'Sudeste', razao_social: 'Usina Paulista de Rerrefino de Lubrificantes SA', nome_fantasia: 'Polo Rerrefino Paulínia', cnpj: '11.987.654/0001-10', autorizacao_anp: 'ANP-SIMP-SP-0089', situacao_anp: 'AUTORIZADO', licenca_operacao: 'LO-CETESB 8892/2024', orgao_ambiental: 'CETESB', cidade: 'Paulínia', estado: 'SP', capacidade_litros: 2500000 },
    { id: 6, tipo: 'rerrefino', regiao: 'Sudeste', razao_social: 'Rerrefinaria Fluminense de Óleos Usados', nome_fantasia: 'Usina Rerrefino Duque de Caxias', cnpj: '55.666.777/0001-88', autorizacao_anp: 'ANP-SIMP-RJ-0034', situacao_anp: 'AUTORIZADO', licenca_operacao: 'LO-INEA 9910/2025', orgao_ambiental: 'INEA', cidade: 'Duque de Caxias', estado: 'RJ', capacidade_litros: 1800000 },
    { id: 7, tipo: 'transbordo', regiao: 'Sul', razao_social: 'Paraná Transbordo e Logística de Óleos', nome_fantasia: 'Entreposto Araucária / PR', cnpj: '88.999.000/0001-11', autorizacao_anp: 'ANP-SIMP-PR-0322', situacao_anp: 'AUTORIZADO', licenca_operacao: 'LO-IAT 4410/2025', orgao_ambiental: 'IAT', cidade: 'Araucária', estado: 'PR', capacidade_litros: 180000 },
    { id: 8, tipo: 'rerrefino', regiao: 'Sul', razao_social: 'Usina Sulriograndense de Rerrefino Ltda', nome_fantasia: 'Rerrefinaria Esteio / RS', cnpj: '66.777.888/0001-99', autorizacao_anp: 'ANP-SIMP-RS-0012', situacao_anp: 'AUTORIZADO', licenca_operacao: 'LO-FEPAM 4012/2024', orgao_ambiental: 'FEPAM', cidade: 'Esteio', estado: 'RS', capacidade_litros: 1200000 },
    { id: 9, tipo: 'rerrefino', regiao: 'Sul', razao_social: 'Paraná Rerrefino e Tecnologia Ambiental', nome_fantasia: 'Usina Araucária / PR', cnpj: '77.888.999/0001-00', autorizacao_anp: 'ANP-SIMP-PR-0056', situacao_anp: 'AUTORIZADO', licenca_operacao: 'LO-IAT 6620/2025', orgao_ambiental: 'IAT', cidade: 'Araucária', estado: 'PR', capacidade_litros: 1600000 },
    { id: 10, tipo: 'transbordo', regiao: 'Nordeste', razao_social: 'Bahia Óleos Coleta e Armazenamento', nome_fantasia: 'Base Camaçari / BA', cnpj: '99.000.111/0001-22', autorizacao_anp: 'ANP-SIMP-BA-0199', situacao_anp: 'AUTORIZADO', licenca_operacao: 'LO-INEMA 3021/2025', orgao_ambiental: 'INEMA', cidade: 'Camaçari', estado: 'BA', capacidade_litros: 220000 }
  ]

  useEffect(() => {
    if (supabase) {
      buscarColetas()
      buscarUnidades()
      carregarCustosSupabase()
    } else {
      setUnidades(agentesAnpPadrao)
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
    if (!supabase) {
      setUnidades(agentesAnpPadrao)
      return
    }
    try {
      const { data: anpData, error } = await supabase.from('agentes_anp').select('*').order('created_at', { ascending: false })
      if (!error && anpData && anpData.length > 0) {
        setUnidades(anpData)
      } else {
        setUnidades(agentesAnpPadrao)
      }
    } catch (err) {
      setUnidades(agentesAnpPadrao)
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
          const uf = est.estado?.sigla || 'ES'
          let reg = 'Sudeste'
          if (['PR', 'SC', 'RS'].includes(uf)) reg = 'Sul'
          else if (['BA', 'PE', 'CE', 'RN', 'PB', 'AL', 'SE', 'PI', 'MA'].includes(uf)) reg = 'Nordeste'
          else if (['AM', 'PA', 'AC', 'RO', 'RR', 'AP', 'TO'].includes(uf)) reg = 'Norte'
          else if (['MT', 'MS', 'GO', 'DF'].includes(uf)) reg = 'Centro-Oeste'

          setNovaUnidade(prev => ({
            ...prev,
            razao_social: json.razao_social || '',
            nome_fantasia: est.nome_fantasia || json.razao_social || '',
            estado: uf,
            regiao: reg,
            cidade: est.cidade?.nome || '',
            endereco: `${est.logradouro || ''}, ${est.numero || 'S/N'}`
          }))
        }
      } finally { setBuscandoDocUnidade(false) }
    }
  }

  const handleSalvarUnidade = async (e) => {
    e.preventDefault()
    if (supabase) {
      await supabase.from('agentes_anp').insert([novaUnidade])
      buscarUnidades()
    } else {
      setUnidades(prev => [novaUnidade, ...prev])
    }
    alert("Agente regulado cadastrado com sucesso!")
  }

  const handleCriarSolicitacao = async (e) => {
    e.preventDefault()
    if (!supabase) {
      const nova = { id: Date.now(), gerador_nome: novaColeta.gerador, cnpj: novaColeta.cnpj, volume_estimado_litros: parseFloat(novaColeta.volume_estimado), valor_esperado_litro: 'Cotação Aberta', mtr_numero: `Cadeia Multi-MTR: ${cadeiaMtrAtual.join(' → ')}`, endereco: novaColeta.endereco, cidade: novaColeta.cidade, estado: novaColeta.estado }
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
        valor_esperado_litro: novaColeta.cotacao_aberta ? 'Cotação Aberta' : `R$ ${novaColeta.valor_esperado}/L`,
        mtr_numero: `Cadeia Multi-MTR: ${cadeiaMtrAtual.join(' → ')}`,
        endereco: novaColeta.endereco, cidade: novaColeta.cidade, estado: novaColeta.estado
      }])
      if (!error) { buscarColetas(); setActiveTab('coletas') }
    } finally { setLoading(false) }
  }

  const agentesFiltradosDashboard = unidades.filter(u => {
    const matchTipo = filtroTipoDashboard === 'todos' || u.tipo === filtroTipoDashboard
    const matchRegiao = filtroRegiao === 'todas' || (u.regiao || 'Sudeste') === filtroRegiao
    const termo = buscaAnp.toLowerCase().trim()
    if (!termo) return matchTipo && matchRegiao

    return matchTipo && matchRegiao && (
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
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('solicitar')}>
            <LubeLoopLogo className="w-11 h-11" />
            <div>
              <h1 className="text-2xl font-black text-white">Lube<span className="text-emerald-400">Loop</span></h1>
              <p className="text-xs text-slate-400">Plataforma Neutra de Gestão & Compliance de OLUC</p>
            </div>
          </div>

          {/* NAVEGAÇÃO SUPERIOR COM NOVA COLETA DESTACADA */}
          <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80">
            <button onClick={() => setActiveTab('solicitar')} className={`px-4 py-2 rounded-xl text-xs font-black transition ${activeTab === 'solicitar' ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-lg scale-105' : 'text-emerald-400 hover:text-white'}`}>⚡ Nova Coleta</button>
            <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'dashboard' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>📊 Painel ANP</button>
            <button onClick={() => setActiveTab('coletas')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'coletas' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>🚛 Ordens ({coletas.length})</button>
            <button onClick={() => setActiveTab('unidades')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'unidades' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>🏢 Cadastrar Agente</button>
            <button onClick={() => setActiveTab('config_custos')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'config_custos' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>💲 Matriz Custos</button>
            <button onClick={() => setActiveTab('config_mtr')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'config_mtr' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>⚙️ MTRs</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
        
        {/* ABA PRINCIPAL DE ENTRADA: NOVA SOLICITAÇÃO DE COLETA (EM DESTAQUE FRONTAL) */}
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
                  Cadastre a ordem de coleta para ativar o teto de cotação e iniciar a operação logística integrada aos órgãos reguladores.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl">
              <form onSubmit={handleCriarSolicitacao} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">CPF ou CNPJ do Gerador</label>
                  <input type="text" required value={novaColeta.cnpj} onChange={handleDocumentoChange} placeholder="Digite para buscar dados na Receita..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Razão Social / Nome do Gerador</label>
                    <input type="text" required value={novaColeta.gerador} onChange={e => setNovaColeta({...novaColeta, gerador: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">Volume Estimado (Litros)</label>
                    <input type="number" required value={novaColeta.volume_estimado} onChange={e => setNovaColeta({...novaColeta, volume_estimado: e.target.value})} placeholder="Ex: 1000" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-emerald-400 font-mono font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Endereço Completo</label>
                    <input type="text" required value={novaColeta.endereco} onChange={e => setNovaColeta({...novaColeta, endereco: e.target.value})} placeholder="Rua, Número, Bairro" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cidade</label>
                      <input type="text" value={novaColeta.cidade} onChange={e => setNovaColeta({...novaColeta, cidade: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">UF</label>
                      <input type="text" value={novaColeta.estado} onChange={e => setNovaColeta({...novaColeta, estado: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white uppercase" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>Validação Econômica de Rota Aplicada nos Bastidores</span>
                  <span className="text-emerald-400 font-mono font-bold">Teto Automático Ativo</span>
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 text-slate-950 font-black py-4 rounded-2xl text-xs uppercase tracking-wider shadow-xl transition transform hover:scale-[1.01]">
                  ✓ Confirmar e Enviar para Cotação & Remuneração
                </button>
              </form>
            </div>
          </div>
        )}

        {/* DASHBOARD COM KPIS MAIORES E SEPARADOS POR REGIÃO */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/40 rounded-3xl p-8 shadow-2xl">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">Volume em Cotação</span>
                <h3 className="text-4xl font-black text-white">{coletas.reduce((acc, item) => acc + (Number(item.volume_estimado_litros) || 0), 0).toLocaleString()} <span className="text-base text-emerald-400">Litros</span></h3>
                <p className="text-xs text-slate-500 mt-2">Total de óleo em negociação</p>
              </div>
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-indigo-500/40 rounded-3xl p-8 shadow-2xl">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-2">Agentes ANP Ativos</span>
                <h3 className="text-4xl font-black text-indigo-400">{unidades.length} <span className="text-base text-slate-400">Homologados</span></h3>
                <p className="text-xs text-slate-500 mt-2">Portal DPP / Central ANP</p>
              </div>
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/40 rounded-3xl p-8 shadow-2xl">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block mb-2">Armazenamento (Bases)</span>
                <h3 className="text-4xl font-black text-cyan-400">{unidades.filter(u => u.tipo === 'transbordo').length} <span className="text-base text-slate-400">Entrepostos</span></h3>
                <p className="text-xs text-slate-500 mt-2">Coletores e transbordos</p>
              </div>
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-purple-500/40 rounded-3xl p-8 shadow-2xl">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-widest block mb-2">Usinas de Rerrefino</span>
                <h3 className="text-4xl font-black text-purple-400">{unidades.filter(u => u.tipo === 'rerrefino').length} <span className="text-base text-slate-400">Outorgadas</span></h3>
                <p className="text-xs text-slate-500 mt-2">Destinação final autorizada</p>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h3 className="text-xl font-black text-white">Relação de Agentes Regulados Autorizados (ANP)</h3>
                  <p className="text-xs text-slate-400">Filtrado por região e atividade regulada.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <select 
                    value={filtroRegiao} onChange={e => setFiltroRegiao(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-bold"
                  >
                    <option value="todas">🌎 Todas as Regiões</option>
                    <option value="Sudeste">Sudeste (SP, RJ, MG, ES)</option>
                    <option value="Sul">Sul (PR, SC, RS)</option>
                    <option value="Nordeste">Nordeste (BA, PE, etc.)</option>
                    <option value="Centro-Oeste">Centro-Oeste</option>
                    <option value="Norte">Norte</option>
                  </select>

                  <input 
                    type="text" placeholder="🔍 Pesquisar na base ANP..." value={buscaAnp} onChange={e => setBuscaAnp(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Região / UF</th>
                      <th className="p-3">Atividade ANP</th>
                      <th className="p-3">Empresa / Razão Social</th>
                      <th className="p-3">Autorização ANP</th>
                      <th className="p-3">Licença Ambiental (LO)</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {agentesFiltradosDashboard.map((u, i) => (
                      <tr key={u.id || i} className="hover:bg-slate-800/40">
                        <td className="p-3 font-sans font-bold text-white">
                          {u.regiao || 'Sudeste'} <span className="block text-[10px] text-emerald-400 font-mono">({u.cidade}/{u.estado})</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${u.tipo === 'transbordo' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' : 'bg-purple-500/10 text-purple-300 border border-purple-500/30'}`}>
                            {u.tipo === 'transbordo' ? 'Base / Transbordo' : 'Rerrefino Outorgado'}
                          </span>
                        </td>
                        <td className="p-3 font-sans font-bold text-white">
                          {u.nome_fantasia || u.razao_social}
                          <span className="block text-[10px] text-slate-400 font-normal">{u.cnpj}</span>
                        </td>
                        <td className="p-3 text-emerald-400 font-bold">{u.autorizacao_anp}</td>
                        <td className="p-3 text-slate-200">
                          {u.licenca_operacao}
                          <span className="block text-[10px] text-slate-400">Órgão: {u.orgao_ambiental}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                            ✓ {u.situacao_anp || 'AUTORIZADO'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MATRIZ DE CUSTOS PROTEGIDA POR SENHA */}
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

        {/* OUTRAS ABAS */}
        {activeTab === 'coletas' && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 text-xs font-mono animate-fadeIn">
            <h2 className="text-lg font-bold text-white mb-4">Ordens de Coleta Registradas ({coletas.length})</h2>
            {coletas.length === 0 ? (
              <p className="text-slate-500">Nenhuma ordem registrada. Utilize a aba "Nova Coleta" para cadastrar.</p>
            ) : (
              coletas.map(c => (
                <div key={c.id} className="p-3 bg-slate-950 rounded-xl mb-2 flex justify-between border border-slate-800">
                  <span>{c.gerador_nome} ({c.cidade}/{c.estado})</span>
                  <span className="text-emerald-400 font-bold">{c.volume_estimado_litros} L</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'unidades' && (
          <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 animate-fadeIn">
            <h2 className="text-xl font-black text-white">🏢 Cadastrar Agente ANP</h2>
            <form onSubmit={handleSalvarUnidade} className="space-y-3">
              <input type="text" placeholder="CNPJ" value={novaUnidade.cnpj} onChange={handleCnpjUnidadeChange} className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-white rounded" required />
              <input type="text" placeholder="Razão Social" value={novaUnidade.razao_social} onChange={e => setNovaUnidade({...novaUnidade, razao_social: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-white rounded" required />
              <button type="submit" className="bg-indigo-500 text-white font-black px-4 py-2 rounded text-xs">Cadastrar</button>
            </form>
          </div>
        )}

        {activeTab === 'config_mtr' && (
          <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 animate-fadeIn">
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
