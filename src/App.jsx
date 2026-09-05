import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function App() {
  const [bolos, setBolos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros, Busca e Layout de Visualização ('grade' ou 'lista')
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');
  const [busca, setBusca] = useState('');
  const [modoVisualizacao, setModoVisualizacao] = useState('grade');

  // Status de Funcionamento
  const [lojaAberta, setLojaAberta] = useState(true);

  // Toast Notificação
  const [toastMsg, setToastMsg] = useState('');

  // Checkout
  const [nomeCliente, setNomeCliente] = useState('');
  const [enderecoCliente, setEnderecoCliente] = useState('');
  const [formaEntrega, setFormaEntrega] = useState('entrega');
  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [precisaTroco, setPrecisaTroco] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const NUMERO_WHATSAPP = "5511996808580"; 

  // Verifica Horário de Funcionamento (08:00 às 21:00)
  useEffect(() => {
    const checarHorario = () => {
      const horaAtual = new Date().getHours();
      setLojaAberta(horaAtual >= 8 && horaAtual < 21);
    };
    checarHorario();
    const interval = setInterval(checarHorario, 60000);
    return () => clearInterval(interval);
  }, []);

  // Busca do Firestore
  useEffect(() => {
    const buscarBolos = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "bolos"));
        const listaBolos = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          listaBolos.push({
            id: doc.id,
            nome: data.Nome || data.nome || "Bolo sem nome",
            preco: parseFloat(data.Preço || data.preco || data.Preco) || 0,
            categoria: data.Categoria || data.categoria || "Geral",
            descricao: data.Descrição || data.descricao || data.Descricao || "",
            ativo: data.Ativo !== undefined ? data.Ativo : (data.ativo !== undefined ? data.ativo : true),
          });
        });
        setBolos(listaBolos);
      } catch (error) {
        console.error("Erro ao buscar cardápio:", error);
      } finally {
        setLoading(false);
      }
    };

    buscarBolos();
  }, []);

  const exibirToast = (mensagem) => {
    setToastMsg(mensagem);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const adicionarAoCarrinho = (bolo) => {
    setCarrinho((prev) => {
      const itemExistente = prev.find((item) => item.id === bolo.id);
      if (itemExistente) {
        return prev.map((item) =>
          item.id === bolo.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }
      return [...prev, { ...bolo, quantidade: 1 }];
    });
    exibirToast(`" ${bolo.nome} " adicionado ao pedido!`);
  };

  const alterarQuantidade = (id, delta) => {
    setCarrinho((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const novaQtd = item.quantidade + delta;
            return novaQtd > 0 ? { ...item, quantidade: novaQtd } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const calcularTotal = () => {
    return carrinho.reduce((acc, curr) => acc + curr.preco * curr.quantidade, 0);
  };

  const totalItensCarrinho = carrinho.reduce((acc, curr) => acc + curr.quantidade, 0);

  const bolosFiltrados = bolos.filter((b) => {
    if (!b.ativo) return false;
    const atendeCategoria = categoriaAtiva === 'Todas' || b.categoria.toLowerCase() === categoriaAtiva.toLowerCase();
    const atendeBusca = b.nome.toLowerCase().includes(busca.toLowerCase()) || b.descricao.toLowerCase().includes(busca.toLowerCase());
    return atendeCategoria && atendeBusca;
  });

  const RolarParaCarrinho = () => {
    const el = document.getElementById('carrinho-secao');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const enviarPedidoWhatsApp = () => {
    if (!nomeCliente.trim()) {
      alert("Por favor, digite seu nome antes de enviar o pedido.");
      return;
    }

    if (formaEntrega === 'entrega' && !enderecoCliente.trim()) {
      alert("Por favor, digite seu endereço de entrega.");
      return;
    }

    let mensagem = `*Novo Pedido - Caseirinhos da Beth*\n\n`;
    mensagem += `*Cliente:* ${nomeCliente}\n`;
    mensagem += `*Forma:* ${formaEntrega === 'entrega' ? 'Entrega' : 'Retirada no local'}\n`;
    
    if (formaEntrega === 'entrega') {
      mensagem += `*Endereço:* ${enderecoCliente}\n`;
    }
    
    mensagem += `\n*Itens do Pedido:*\n`;
    carrinho.forEach((item) => {
      mensagem += `• ${item.quantidade}x ${item.nome} (R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')})\n`;
    });

    mensagem += `\n*Total:* R$ ${calcularTotal().toFixed(2).replace('.', ',')}\n`;
    mensagem += `*Pagamento:* ${formaPagamento}\n`;
    
    if (formaPagamento === 'Dinheiro' && precisaTroco.trim()) {
      mensagem += `*Troco para:* R$ ${precisaTroco}\n`;
    }

    if (observacoes.trim()) {
      mensagem += `\n*Observações:* ${observacoes}\n`;
    }

    const url = `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const categorias = ["Todas", "Bolos Tradicionais", "Bolos Especiais", "Bolos com Cobertura"];

  return (
    <div className="min-h-screen bg-pink-50 font-sans pb-24 md:pb-12 relative">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-xl border border-gray-700 animate-bounce">
          ✨ {toastMsg}
        </div>
      )}

      {/* Header Estilizado */}
      <header className="bg-amber-50/80 text-center py-10 px-4 shadow-sm border-b border-pink-100 relative overflow-hidden">
        <div className="max-w-md mx-auto flex flex-col items-center justify-center relative">
          
          {/* Coração Superior */}
          <div className="flex items-center gap-2 mb-1 text-rose-700 opacity-90">
            <span className="h-[1.5px] w-8 bg-rose-600 rounded-full"></span>
            <svg className="w-5 h-5 fill-rose-600" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span className="h-[1.5px] w-8 bg-rose-600 rounded-full"></span>
          </div>

          {/* Título Principal */}
          <h1 
            className="text-5xl md:text-6xl font-normal leading-tight tracking-wide drop-shadow-sm select-none"
            style={{ fontFamily: "'Pacifico', cursive", color: '#4a1d0d' }}
          >
            Caseirinhos
          </h1>

          <div className="flex items-center justify-center gap-2 -mt-3 relative">
            <span 
              className="text-2xl md:text-3xl"
              style={{ fontFamily: "'Pacifico', cursive", color: '#4a1d0d' }}
            >
              da
            </span>
            <span 
              className="text-5xl md:text-6xl text-rose-700"
              style={{ fontFamily: "'Pacifico', cursive" }}
            >
              Beth
            </span>

            {/* Coração Desenhado */}
            <svg className="w-8 h-8 text-rose-600 inline-block ml-1 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>

          {/* Subtítulo */}
          <p className="mt-3 text-pink-900/80 text-sm md:text-base font-semibold tracking-wider">
            Bolos Caseiros e Especiais | Feitos com amor
          </p>

          {/* Status Dinâmico */}
          <span className={`inline-flex items-center gap-2 mt-4 text-xs font-bold px-4 py-1.5 rounded-full border shadow-sm ${
            lojaAberta 
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
              : 'bg-rose-100 text-rose-800 border-rose-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${lojaAberta ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            {lojaAberta ? 'Aberto Agora (08:00 às 21:00)' : 'Fechado no momento (Abre às 08:00)'}
          </span>

        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Seção Principal */}
        <section className="md:col-span-2">
          
          {/* Busca por Nome */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Buscar por sabor (ex: Nutella, Cenoura, Milho)..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white shadow-sm"
            />
          </div>

          {/* Categorias + Alternador de Visualização */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {categorias.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaAtiva(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    categoriaAtiva.toLowerCase() === cat.toLowerCase()
                      ? 'bg-pink-600 text-white shadow'
                      : 'bg-white text-pink-600 border border-pink-200 hover:bg-pink-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Botão de Alternar Layout */}
            <div className="bg-white p-1 rounded-xl border border-pink-200 flex items-center gap-1 shadow-sm">
              <button
                onClick={() => setModoVisualizacao('grade')}
                title="Visualização em Cards"
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  modoVisualizacao === 'grade'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-pink-600'
                }`}
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z"/>
                </svg>
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => setModoVisualizacao('lista')}
                title="Visualização em Lista"
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  modoVisualizacao === 'lista'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-pink-600'
                }`}
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
                </svg>
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">Nosso Cardápio</h2>
          
          {loading ? (
            <p className="text-gray-500">Carregando delícias...</p>
          ) : bolosFiltrados.length === 0 ? (
            <p className="text-gray-500">Nenhum bolo encontrado para essa pesquisa.</p>
          ) : modoVisualizacao === 'grade' ? (
            
            /* VISUALIZAÇÃO EM GRADE (CARDS) */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bolosFiltrados.map((bolo) => (
                <div key={bolo.id} className="bg-white rounded-xl shadow p-5 flex flex-col justify-between border border-pink-100 hover:shadow-md transition">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">{bolo.nome}</h3>
                      <span className="text-xs bg-pink-100 text-pink-600 font-semibold px-2.5 py-1 rounded-full h-fit whitespace-nowrap">
                        {bolo.categoria}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{bolo.descricao}</p>
                  </div>

                  <div className="mt-5 flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <span className="text-xs text-gray-400 block font-medium">Preço</span>
                      <span className="text-lg font-bold text-pink-600">
                        R$ {bolo.preco.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <button
                      onClick={() => adicionarAoCarrinho(bolo)}
                      className="bg-pink-500 hover:bg-pink-600 text-white font-medium px-4 py-2 rounded-lg transition active:scale-95 shadow-sm"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>
              ))}
            </div>

          ) : (

            /* VISUALIZAÇÃO EM LISTA ENXUTA */
            <div className="bg-white rounded-xl shadow border border-pink-100 divide-y divide-gray-100">
              {bolosFiltrados.map((bolo) => (
                <div key={bolo.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-pink-50/50 transition">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-800">{bolo.nome}</h3>
                      <span className="text-[10px] bg-pink-100 text-pink-600 font-semibold px-2 py-0.5 rounded-full">
                        {bolo.categoria}
                      </span>
                    </div>
                    {bolo.descricao && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{bolo.descricao}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <span className="text-base font-bold text-pink-600">
                      R$ {bolo.preco.toFixed(2).replace('.', ',')}
                    </span>
                    <button
                      onClick={() => adicionarAoCarrinho(bolo)}
                      className="bg-pink-500 hover:bg-pink-600 text-white font-medium text-xs px-3 py-2 rounded-lg transition active:scale-95 shadow-sm"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>
              ))}
            </div>

          )}
        </section>

        {/* Seção do Carrinho */}
        <aside id="carrinho-secao" className="bg-white rounded-xl shadow p-6 border border-pink-100 h-fit sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b">Seu Pedido</h2>
          
          {carrinho.length === 0 ? (
            <p className="text-gray-400 text-center py-6">Seu carrinho está vazio.</p>
          ) : (
            <div className="space-y-4">
              <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
                {carrinho.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm border-b pb-2">
                    <div className="pr-2">
                      <p className="font-medium text-gray-700">{item.nome}</p>
                      <p className="text-pink-600 font-bold">
                        R$ {(item.preco * item.quantidade).toFixed(2).replace('.', ',')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-pink-50 px-2 py-1 rounded-lg border border-pink-100">
                      <button
                        onClick={() => alterarQuantidade(item.id, -1)}
                        className="text-pink-600 font-bold px-1.5 hover:bg-pink-200 rounded text-base"
                      >
                        -
                      </button>
                      <span className="font-semibold text-gray-800 w-4 text-center">{item.quantidade}</span>
                      <button
                        onClick={() => alterarQuantidade(item.id, 1)}
                        className="text-pink-600 font-bold px-1.5 hover:bg-pink-200 rounded text-base"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-pink-600">
                  R$ {calcularTotal().toFixed(2).replace('.', ',')}
                </span>
              </div>

              {/* Form de Checkout */}
              <div className="pt-2 border-t space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Seu Nome *</label>
                  <input
                    type="text"
                    placeholder="Digite seu nome"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Opção</label>
                  <select
                    value={formaEntrega}
                    onChange={(e) => setFormaEntrega(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-pink-500"
                  >
                    <option value="entrega">Entrega</option>
                    <option value="retirada">Retirar no local</option>
                  </select>
                </div>

                {formaEntrega === 'entrega' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Endereço de Entrega *</label>
                    <textarea
                      placeholder="Rua, número, bairro e complemento"
                      value={enderecoCliente}
                      onChange={(e) => setEnderecoCliente(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Forma de Pagamento</label>
                  <select
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-pink-500"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>

                {formaPagamento === 'Dinheiro' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Troco para quanto?</label>
                    <input
                      type="text"
                      placeholder="Ex: 50,00 (deixe em branco se não precisar)"
                      value={precisaTroco}
                      onChange={(e) => setPrecisaTroco(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Observações do Pedido</label>
                  <textarea
                    placeholder="Ex: Mandar sem canela, embalar para presente..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>

                <button
                  onClick={enviarPedidoWhatsApp}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm active:scale-95"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                  </svg>
                  Enviar Pedido no WhatsApp
                </button>
              </div>
            </div>
          )}
        </aside>

      </main>

      {/* Barra Flutuante de Carrinho no Mobile */}
      {carrinho.length > 0 && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-40">
          <button
            onClick={RolarParaCarrinho}
            className="w-full bg-pink-600 text-white font-bold py-3.5 px-5 rounded-2xl shadow-2xl flex items-center justify-between border border-pink-400 active:scale-95 transition"
          >
            <div className="flex items-center gap-2">
              <span className="bg-white text-pink-600 text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center">
                {totalItensCarrinho}
              </span>
              <span>Ver Pedido</span>
            </div>
            <span className="text-pink-100 font-extrabold">
              R$ {calcularTotal().toFixed(2).replace('.', ',')}
            </span>
          </button>
        </div>
      )}

    </div>
  );
}
