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
  const [buscandoDocumento, setBuscandoDocumento] = useState(false)

  const [novaColeta, setNovaColeta] = useState({
    gerador: '',
    cnpj: '',
    inscricao_estadual: '',
    volume_estimado: '',
    endereco: '',
    cidade: 'Serra',
    estado: 'ES'
  })

  // Carregar coletas do Supabase
  useEffect(() => {
    if (supabase) {
      buscarColetas()
    }
  }, [])

  const buscarColetas = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('coletas')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setColetas(data)
      }
    } catch (err) {
      console.error("Erro ao carregar coletas:", err)
    } finally {
      setLoading(false)
    }
  }

  // Consulta inteligente: CPF no Supabase vs CNPJ na Receita/Sintegra
  const handleDocumentoChange = async (e) => {
    const valorDigitado = e.target.value
    setNovaColeta(prev => ({ ...prev, cnpj: valorDigitado }))

    const docLimpo = valorDigitado.replace(/\D/g, '')

    // 1. CPF (11 dígitos): Busca histórico de cliente no Supabase
    if (docLimpo.length === 11) {
      setBuscandoDocumento(true)
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
            setNovaColeta(prev => ({
              ...prev,
              inscricao_estadual: 'Isento (Pessoa Física)'
            }))
          }
        }
      } catch (err) {
        console.error("Erro ao buscar CPF no banco:", err)
      } finally {
        setBuscandoDocumento(false)
      }
    }

    // 2. CNPJ (14 dígitos): Consulta Receita Federal e Sintegra por UF
    if (docLimpo.length === 14) {
      setBuscandoDocumento(true)
      const ehFilial = !docLimpo.substring(8, 12).includes('0001')

      try {
        const response = await fetch(`https://publica.cnpj.ws/cnpj/${docLimpo}`)
        
        if (response.ok) {
          const data = await response.json()
          const est = data.estabelecimento || {}
          const ufDoEstado = est.estado?.sigla || ''
          const ieArray = est.inscricoes_estaduais || []

          let ieEncontrada = ''
          if (ieArray.length > 0) {
            const ieDoEstado = ieArray.filter(item => item.estado?.sigla === ufDoEstado && item.ativo !== false)
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
            estado: ufDoEstado || prev.estado
          }))
        }
      } catch (err) {
        console.error("Erro na busca do CNPJ:", err)
      } finally {
        setBuscandoDocumento(false)
      }
    }
  }

  const handleCriarSolicitacao = async (e) => {
    e.preventDefault()
    if (!supabase) return

    setLoading(true)
    try {
      const { data, error } = await supabase.from('coletas').insert([
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
        alert('Erro ao registar solicitação. Verifique as permissões no Supabase.')
      }
    } catch (err) {
      alert('Erro na comunicação com o banco de dados.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Barra de Navegação */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-emerald-500/20">
            LL
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              LubeLoop <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">SaaS</span>
            </h1>
            <p className="text-xs text-slate-400">Gestão e Otimização de Coleta de OLUC</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-emerald-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Painel Geral
          </button>
          <button 
            onClick={() => setActiveTab('solicitar')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'solicitar' ? 'bg-emerald-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Nova Solicitação
          </button>
          <button 
            onClick={() => setActiveTab('coletas')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'coletas' ? 'bg-emerald-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Coletas & MTR ({coletas.length})
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-slate-300 font-mono">Busca CPF & CNPJ: Ativa</span>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Volume Total Solicitado</p>
                <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                  {coletas.reduce((acc, item) => acc + (Number(item.volume_estimado_litros) || 0), 0).toLocaleString()} L
                </h3>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Solicitações Pendentes</p>
                <h3 className="text-2xl font-bold text-amber-400 mt-1">
                  {coletas.filter(c => c.status === 'pendente').length}
                </h3>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs text-slate-400 uppercase tracking-wider">MTRs Emitidos (SINIR)</p>
                <h3 className="text-2xl font-bold text-cyan-400 mt-1">
                  {coletas.filter(c => c.mtr_numero).length}
                </h3>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Busca de Clientes</p>
                <h3 className="text-2xl font-bold text-indigo-400 mt-1">CPF & CNPJ</h3>
              </div>
            </div>

            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Automação de Rota & SINIR para OLUC</h2>
                <p className="text-slate-300 max-w-xl text-sm leading-relaxed">
                  Preenchimento automático por consulta à Receita Federal / Sintegra para empresas (CNPJ) e histórico interno no Supabase para pessoas físicas (CPF).
                </p>
              </div>
              <button 
                onClick={() => setActiveTab('solicitar')}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap"
              >
                + Solicitar Coleta de Óleo
              </button>
            </div>
          </div>
        )}

        {activeTab === 'solicitar' && (
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-1">Nova Solicitação de Coleta de OLUC</h2>
            <p className="text-xs text-slate-400 mb-6">Digite o CNPJ (14 dígitos) para buscar na Receita/Sintegra ou CPF (11 dígitos) para buscar no histórico do Supabase.</p>

            <form onSubmit={handleCriarSolicitacao} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-semibold flex items-center justify-between">
                  <span>CPF ou CNPJ do Gerador</span>
                  {buscandoDocumento && <span className="text-emerald-400 animate-pulse font-normal">🔍 Consultando dados...</span>}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Digite os 11 números do CPF ou 14 do CNPJ"
                  value={novaColeta.cnpj}
                  onChange={handleDocumentoChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Razão Social / Nome do Gerador</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Preenchido automaticamente"
                    value={novaColeta.gerador}
                    onChange={e => setNovaColeta({...novaColeta, gerador: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1 flex items-center justify-between">
                    <span>Inscrição Estadual (Sintegra)</span>
                    <a 
                      href="https://www.sintegra.es.gov.br/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:underline font-normal"
                    >
                      Sintegra ES ↗
                    </a>
                  </label>
                  <input 
                    type="text" 
                    placeholder="Automático para CNPJ / Isento para CPF"
                    value={novaColeta.inscricao_estadual}
                    onChange={e => setNovaColeta({...novaColeta, inscricao_estadual: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Volume Estimado (Litros)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="Ex: 1000"
                    value={novaColeta.volume_estimado}
                    onChange={e => setNovaColeta({...novaColeta, volume_estimado: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Endereço Completo</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Rua, Número, Bairro"
                    value={novaColeta.endereco}
                    onChange={e => setNovaColeta({...novaColeta, endereco: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Cidade</label>
                  <input 
                    type="text" 
                    value={novaColeta.cidade}
                    onChange={e => setNovaColeta({...novaColeta, cidade: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Estado (UF)</label>
                  <input 
                    type="text" 
                    value={novaColeta.estado}
                    onChange={e => setNovaColeta({...novaColeta, estado: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading || buscandoDocumento}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 mt-4"
              >
                {loading ? 'A registar...' : 'Confirmar Solicitação'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'coletas' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Ordens de Coleta Registadas</h2>
                <p className="text-xs text-slate-400">Listagem de solicitações com validação fiscal no Supabase</p>
              </div>
              <button 
                onClick={buscarColetas}
                className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition"
              >
                ↻ Atualizar Dados
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">A carregar registos do banco de dados...</div>
            ) : coletas.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
                Nenhuma solicitação encontrada no Supabase. Crie a primeira na aba "Nova Solicitação".
              </div>
