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
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)

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

  // Função para consultar Receita Federal e Sintegra automaticamente ao digitar o CNPJ
  const handleCnpjChange = async (e) => {
    const valorDigitado = e.target.value
    setNovaColeta(prev => ({ ...prev, cnpj: valorDigitado }))

    // Remove caracteres especiais para validação
    const cnpjLimpo = valorDigitado.replace(/\D/g, '')

    // Dispara a consulta assim que completar 14 números
    if (cnpjLimpo.length === 14) {
      setBuscandoCnpj(true)
      try {
        // Busca integradora da Receita Federal e Sintegra
        const response = await fetch(`https://publica.cnpj.ws/cnpj/${cnpjLimpo}`)
        
        if (response.ok) {
          const data = await response.json()
          
          // Extrai Inscrição Estadual do Sintegra (se disponível)
          let ieEncontrada = 'Isento / Não informada'
          if (data.estabelecimentos && data.estabelecimentos.inscricoes_estaduais?.length > 0) {
            ieEncontrada = data.estabelecimentos.inscricoes_estaduais[0].inscricao_estadual || ieEncontrada
          }

          setNovaColeta(prev => ({
            ...prev,
            gerador: data.razao_social || data.estabelecimento?.nome_fantasia || prev.gerador,
            inscricao_estadual: ieEncontrada,
            endereco: `${data.estabelecimento?.logradouro || ''}, ${data.estabelecimento?.numero || 'S/N'} - ${data.estabelecimento?.bairro || ''}`,
            cidade: data.estabelecimento?.cidade?.nome || prev.cidade,
            estado: data.estabelecimento?.estado?.sigla || prev.estado
          }))
        } else {
          // Fallback para BrasilAPI caso a API primária encontre limite de requisições
          const resFallback = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`)
          if (resFallback.ok) {
            const dataFb = await resFallback.json()
            setNovaColeta(prev => ({
              ...prev,
              gerador: dataFb.razao_social || dataFb.nome_fantasia || prev.gerador,
              endereco: `${dataFb.logradouro || ''}, ${dataFb.numero || 'S/N'} - ${dataFb.bairro || ''}`,
              cidade: dataFb.municipio || prev.cidade,
              estado: dataFb.uf || prev.estado
            }))
          }
        }
      } catch (err) {
        console.error("Erro na busca do CNPJ:", err)
      } finally {
        setBuscandoCnpj(false)
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
          inscricao_estadual: novaColeta.inscricao_estadual,
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
        alert('Erro ao registar solicitação. Verifique se a coluna inscricao_estadual existe na tabela do Supabase.')
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
          <span className="text-slate-300 font-mono">Supabase & Receita/Sintegra API: Ativos</span>
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
                <p className="text-xs text-slate-400 uppercase tracking-wider">Consulta Receita Federal</p>
                <h3 className="text-2xl font-bold text-indigo-400 mt-1">Automática</h3>
              </div>
            </div>

            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Automação de Rota & SINIR para OLUC</h2>
                <p className="text-slate-300 max-w-xl text-sm leading-relaxed">
                  Busca automática de dados fiscais (Receita Federal/Sintegra) no cadastro de geradores com alocação otimizada para a frota de recolha.
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
            <p className="text-xs text-slate-400 mb-6">Digite os 14 números do CNPJ para buscar os dados na Receita Federal e Sintegra automaticamente.</p>

            <form onSubmit={handleCriarSolicitacao} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-semibold flex items-center justify-between">
                  <span>CNPJ do Gerador</span>
                  {buscandoCnpj && <span className="text-emerald-400 animate-pulse font-normal">🔍 Consultando Receita Federal & Sintegra...</span>}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="00.000.000/0001-00 (digite os 14 números)"
                  value={novaColeta.cnpj}
                  onChange={handleCnpjChange}
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
                  <label className="block text-xs text-slate-300 mb-1">Inscrição Estadual (Sintegra)</label>
                  <input 
                    type="text" 
                    placeholder="Busca automática do Sintegra"
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
                disabled={loading || buscandoCnpj}
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
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-xs text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-3 rounded-l-lg">Gerador</th>
                      <th className="p-3">Inscrição Estadual</th>
                      <th className="p-3">Volume</th>
                      <th className="p-3">Localização</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 rounded-r-lg">MTR SINIR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {coletas.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-800/50">
                        <td className="p-3 font-semibold text-white">
                          {item.gerador_nome || 'Gerador sem nome'}
                          <span className="block text-xs font-normal text-slate-400">{item.cnpj}</span>
                        </td>
                        <td className="p-3 text-xs font-mono text-indigo-300">
                          {item.inscricao_estadual || 'Não informada'}
                        </td>
                        <td className="p-3 font-mono text-emerald-400 font-semibold">
                          {item.volume_estimado_litros} L
                        </td>
                        <td className="p-3 text-xs text-slate-300">
                          {item.cidade}/{item.estado}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {item.status || 'Pendente'}
                          </span>
                        </td>
                        <td className="p-3 text-xs font-mono text-slate-400">
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
