import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

export default function App() {
  const [bolos, setBolos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [loading, setLoading] = useState(true);

  // Autenticação Admin & Modal Login
  const [user, setUser] = useState(null);
  const [mostrarModalLogin, setMostrarModalLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erroLogin, setErroLogin] = useState('');

  // Estados do Painel CRUD Admin
  const [boloEditando, setBoloEditando] = useState(null);
  const [nomeForm, setNomeForm] = useState('');
  const [precoForm, setPrecoForm] = useState('');
  const [categoriaForm, setCategoriaForm] = useState('Bolos Tradicionais');
  const [descricaoForm, setDescricaoForm] = useState('');
  const [destaqueForm, setDestaqueForm] = useState(false);

  // Filtros, Busca e Layout
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');
  const [busca, setBusca] = useState('');
  const [modoVisualizacao, setModoVisualizacao] = useState('grade');

  // Status de Funcionamento
  const [lojaAberta, setLojaAberta] = useState(true);

  // Toast Notificação
  const [toastMsg, setToastMsg] = useState('');

  // Checkout & Agendamento
  const [nomeCliente, setNomeCliente] = useState('');
  const [enderecoCliente, setEnderecoCliente] = useState('');
  const [formaEntrega, setFormaEntrega] = useState('entrega');
  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [precisaTroco, setPrecisaTroco] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [dataDesejada, setDataDesejada] = useState('');
  const [horarioDesejado, setHorarioDesejado] = useState('');

  const VALOR_TAXA_ENTREGA = 7.00;

  // Modal do PIX
  const [mostrarModalPix, setMostrarModalPix] = useState(false);
  const [chaveCopiada, setChaveCopiada] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(300);

  const NUMERO_WHATSAPP = "5511996808580"; 
  const CHAVE_PIX = "b765a02d-19ad-4eae-8c5c-da574b0c2b9b";

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (usuarioAtual) => {
      setUser(usuarioAtual);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    let timer;
    if (mostrarModalPix && tempoRestante > 0) {
      timer = setInterval(() => {
        setTempoRestante((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mostrarModalPix, tempoRestante]);

  const formatarTempo = (segundos) => {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
  };

  useEffect(() => {
    const checarHorario = () => {
      const horaAtual = new Date().getHours();
      setLojaAberta(horaAtual >= 8 && horaAtual < 21);
    };
    checarHorario();
    const interval = setInterval(checarHorario, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setLoading(true);
    const bolosRef = collection(db, "bolos");

    const unsubscribe = onSnapshot(
      bolosRef,
      (querySnapshot) => {
        const listaBolos = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          listaBolos.push({
            id: doc.id,
            nome: data.Nome || data.nome || "Bolo sem nome",
            preco: parseFloat(data.Preço || data.preco || data.Preco) || 0,
            categoria: data.Categoria || data.categoria || "Geral",
            descricao: data.Descrição || data.descricao || data.Descricao || "",
            destaque: data.Destaque || data.destaque || false,
            ativo: data.Ativo !== undefined ? data.Ativo : (data.ativo !== undefined ? data.ativo : true),
          });
        });
        setBolos(listaBolos);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao escutar cardápio:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErroLogin('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      setMostrarModalLogin(false);
      setSenha('');
      setEmail('');
      exibirToast("Painel Admin liberado com sucesso!");
    } catch (error) {
      console.error("Erro Firebase:", error);
      setErroLogin(`E-mail ou senha incorretos.`);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    exibirToast("Você saiu do modo Admin.");
  };

  const handleSalvarBolo = async (e) => {
    e.preventDefault();
    if (!nomeForm || !precoForm) {
      alert("Preencha o nome e o preço.");
      return;
    }

    const dadosBolo = {
      nome: nomeForm,
      Preço: parseFloat(precoForm),
      preco: parseFloat(precoForm),
      categoria: categoriaForm,
      descricao: descricaoForm,
      Destaque: destaqueForm,
      destaque: destaqueForm,
      Ativo: true,
      ativo: true
    };

    try {
      if (boloEditando && boloEditando.id) {
        const boloRef = doc(db, "bolos", boloEditando.id);
        await updateDoc(boloRef, dadosBolo);
        exibirToast("Produto atualizado!");
      } else {
        await addDoc(collection(db, "bolos"), dadosBolo);
        exibirToast("Novo produto cadastrado!");
      }
      resetFormAdmin();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar produto.");
    }
  };

  const handleEditarBolo = (bolo) => {
    setBoloEditando(bolo);
    setNomeForm(bolo.nome || bolo.Nome || "");
    setPrecoForm(bolo.preco !== undefined ? bolo.preco : (bolo.Preço || ""));
    setCategoriaForm(bolo.categoria || bolo.Categoria || "Bolos Tradicionais");
    setDescricaoForm(bolo.descricao || bolo.Descrição || "");
    setDestaqueForm(bolo.destaque !== undefined ? bolo.destaque : (bolo.Destaque || false));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletarBolo = async (id) => {
    if (window.confirm("Deseja excluir este produto?")) {
      try {
        await deleteDoc(doc(db, "bolos", id));
        exibirToast("Produto excluído!");
      } catch (error) {
        console.error("Erro ao deletar:", error);
      }
    }
  };

  const resetFormAdmin = () => {
    setBoloEditando(null);
    setNomeForm('');
    setPrecoForm('');
    setCategoriaForm('Bolos Tradicionais');
    setDescricaoForm('');
    setDestaqueForm(false);
  };

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

  const calcularSubtotal = () => {
    return carrinho.reduce((acc, curr) => acc + curr.preco * curr.quantidade, 0);
  };

  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    const taxa = formaEntrega === 'entrega' ? VALOR_TAXA_ENTREGA : 0;
    return subtotal + taxa;
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

  const validarFormulario = () => {
    if (!nomeCliente.trim()) {
      alert("Por favor, digite seu nome antes de enviar o pedido.");
      return false;
    }
    if (formaEntrega === 'entrega' && !enderecoCliente.trim()) {
      alert("Por favor, digite seu endereço de entrega.");
      return false;
    }
    if (!dataDesejada || !horarioDesejado) {
      alert("Por favor, informe a Data e o Horário desejados para a encomenda.");
      return false;
    }
    return true;
  };

  const processarCheckout = () => {
    if (!validarFormulario()) return;

    if (formaPagamento === 'Pix') {
      setTempoRestante(300);
      setMostrarModalPix(true);
    } else {
      enviarPedidoWhatsApp();
    }
  };

  const copiarChavePix = () => {
    navigator.clipboard.writeText(CHAVE_PIX);
    setChaveCopiada(true);
    setTimeout(() => setChaveCopiada(false), 3000);
  };

  const enviarPedidoWhatsApp = () => {
    let mensagem = `*Novo Pedido (Sob Encomenda) - Caseirinhos da Beth*\n\n`;
    mensagem += `*Cliente:* ${nomeCliente}\n`;
    mensagem += `*Data para Encomenda:* ${dataDesejada.split('-').reverse().join('/')} às ${horarioDesejado}\n`;
    mensagem += `*Forma:* ${formaEntrega === 'entrega' ? 'Entrega (Redondezas)' : 'Retirada no local'}\n`;
    
    if (formaEntrega === 'entrega') {
      mensagem += `*Endereço:* ${enderecoCliente}\n`;
    }
    
    mensagem += `\n*Itens Encomendados:*\n`;
    carrinho.forEach((item) => {
      mensagem += `• ${item.quantidade}x ${item.nome} (R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')})\n`;
    });

    const subtotal = calcularSubtotal();
    mensagem += `\n*Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
    
    if (formaEntrega === 'entrega') {
      mensagem += `*Taxa de Entrega:* R$ ${VALOR_TAXA_ENTREGA.toFixed(2).replace('.', ',')}\n`;
    }

    mensagem += `*Total Geral:* R$ ${calcularTotal().toFixed(2).replace('.', ',')}\n`;
    mensagem += `*Pagamento:* ${formaPagamento}\n`;
    
    if (formaPagamento === 'Pix') {
      mensagem += `_Pagamento realizado via PIX antecipado (Comprovante em anexo)_\n`;
    }

    if (formaPagamento === 'Dinheiro' && precisaTroco.trim()) {
      mensagem += `*Troco para:* R$ ${precisaTroco}\n`;
    }

    if (observacoes.trim()) {
      mensagem += `\n*Observações:* ${observacoes}\n`;
    }

    const url = `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setMostrarModalPix(false);
  };

  const categorias = ["Todas", "Bolos Tradicionais", "Bolos Especiais", "Bolos com Cobertura"];
  const isAdmin = user && user.email === "celotube14@gmail.com";

  return (
    <div className="min-h-screen bg-pink-50 font-sans pb-24 md:pb-12 relative flex flex-col justify-between">
      
      <div>
        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-xl border border-gray-700 animate-bounce">
            ✨ {toastMsg}
          </div>
        )}

        {/* Header Estilizado */}
        <header className="bg-amber-50/80 text-center py-10 px-4 shadow-sm border-b border-pink-100 relative overflow-hidden">
          
          {isAdmin && (
            <div className="absolute top-3 right-4 z-10 flex items-center gap-2 bg-white/90 px-3 py-1 rounded-full border border-pink-200 shadow-sm">
              <span className="text-xs font-bold text-pink-700">Admin Ativo</span>
              <button onClick={handleLogout} className="text-xs text-red-600 hover:underline font-semibold">Sair</button>
            </div>
          )}

          <div className="max-w-md mx-auto flex flex-col items-center justify-center relative">
            <div className="flex items-center gap-2 mb-1 text-rose-700 opacity-90">
              <span className="h-[1.5px] w-8 bg-rose-600 rounded-full"></span>
              <svg className="w-5 h-5 fill-rose-600" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span className="h-[1.5px] w-8 bg-rose-600 rounded-full"></span>
            </div>

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

              <svg className="w-8 h-8 text-rose-600 inline-block ml-1 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>

            <p className="mt-3 text-pink-900/80 text-sm md:text-base font-semibold tracking-wider">
              Bolos Caseiros e Especiais | Feitos com amor
            </p>

            <div className="mt-3 bg-amber-100 text-amber-900 border border-amber-300 text-xs md:text-sm font-bold px-4 py-2 rounded-xl shadow-sm flex items-center gap-2">
              <span>📅</span>
              <span>Trabalhamos exclusivamente <strong>Sob Encomenda</strong></span>
            </div>

            <span className={`inline-flex items-center gap-2 mt-3 text-xs font-bold px-4 py-1.5 rounded-full border shadow-sm ${
              lojaAberta 
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                : 'bg-rose-100 text-rose-800 border-rose-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${lojaAberta ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              {lojaAberta ? 'Aberto Agora (08:00 às 21:00)' : 'Fechado no momento (Abre às 08:00)'}
            </span>

          </div>
        </header>

        {/* Modal Login Admin */}
        {mostrarModalLogin && !isAdmin && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xs w-full p-6 shadow-2xl border border-pink-100">
              <div className="flex justify-between items-center pb-2 border-b mb-4">
                <h3 className="text-lg font-bold text-gray-800">Acesso Administrativo</h3>
                <button 
                  onClick={() => setMostrarModalLogin(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold"
                >
                  ✕
                </button>
              </div>

              {erroLogin && (
                <p className="text-xs bg-red-50 text-red-600 p-2.5 rounded-lg mb-3 border border-red-100 font-semibold break-words">
                  {erroLogin}
                </p>
              )}

              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="Seu e-mail de admin"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Senha</label>
                  <input
                    type="password"
                    placeholder="Sua senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 rounded-xl text-sm transition"
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarModalLogin(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold px-3 py-2 rounded-xl text-sm transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto p-4 md:p-6">

          {/* PAINEL ADMIN */}
          {isAdmin && (
            <section className="bg-white rounded-xl shadow-md p-6 border-2 border-pink-300 mb-8">
              <h2 className="text-xl font-bold text-pink-700 mb-4 flex items-center gap-2">
                <span>🛠️</span> {boloEditando ? "Editar Produto do Cardápio" : "Cadastrar Novo Bolo"}
              </h2>

              <form onSubmit={handleSalvarBolo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nome do Bolo"
                  value={nomeForm}
                  onChange={(e) => setNomeForm(e.target.value)}
                  required
                  className="text-sm p-2.5 border border-pink-200 rounded-lg focus:outline-none focus:border-pink-500"
                />

                <input
                  type="number"
                  step="0.01"
                  placeholder="Preço (R$)"
                  value={precoForm}
                  onChange={(e) => setPrecoForm(e.target.value)}
                  required
                  className="text-sm p-2.5 border border-pink-200 rounded-lg focus:outline-none focus:border-pink-500"
                />

                <select
                  value={categoriaForm}
                  onChange={(e) => setCategoriaForm(e.target.value)}
                  className="text-sm p-2.5 border border-pink-200 rounded-lg focus:outline-none focus:border-pink-500 bg-white md:col-span-2"
                >
                  {categorias.filter(c => c !== "Todas").map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <textarea
                  placeholder="Descrição dos ingredientes..."
                  value={descricaoForm}
                  onChange={(e) => setDescricaoForm(e.target.value)}
                  rows={2}
                  className="md:col-span-2 text-sm p-2.5 border border-pink-200 rounded-lg focus:outline-none focus:border-pink-500"
                />

                <div className="md:col-span-2 flex items-center gap-2 bg-pink-50 p-3 rounded-lg border border-pink-100">
                  <input
                    type="checkbox"
                    id="chkDestaque"
                    checked={destaqueForm}
                    onChange={(e) => setDestaqueForm(e.target.checked)}
                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                  />
                  <label htmlFor="chkDestaque" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    Marcar como Mais Vendido / Destaque ⭐
                  </label>
                </div>

                <div className="md:col-span-2 flex gap-3">
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition shadow"
                  >
                    {boloEditando ? "Atualizar Bolo" : "Cadastrar Bolo"}
                  </button>
                  
                  {boloEditando && (
                    <button
                      type="button"
                      onClick={resetFormAdmin}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-xl text-sm transition"
                    >
                      Cancelar Edição
                    </button>
                  )}
                </div>
              </form>
            </section>
          )}

          {/* ESTRUTURA PRINCIPAL EM GRID: 2 COLUNAS CARDÁPIO + 1 COLUNA CARRINHO NO PC */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* COLUNA ESQUERDA: CARDÁPIO */}
            <div className={carrinho.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
              
              {/* Filtros de Categorias em Carrossel/Abas */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
                {categorias.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaAtiva(cat)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition shadow-sm ${
                      categoriaAtiva.toLowerCase() === cat.toLowerCase()
                        ? 'bg-pink-600 text-white'
                        : 'bg-white text-pink-700 border border-pink-200 hover:bg-pink-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Barra de Busca + Modo de Exibição */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <input
                  type="text"
                  placeholder="🔍 Buscar por sabor (ex: Nutella, Cenoura, Milho)..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white shadow-sm"
                />

                <div className="bg-white p-1 rounded-xl border border-pink-200 flex items-center justify-center gap-1 self-end sm:self-auto shadow-sm">
                  <button
                    onClick={() => setModoVisualizacao('grade')}
                    title="Visualização em Cards"
                    className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      modoVisualizacao === 'grade'
                        ? 'bg-pink-500 text-white'
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
                        ? 'bg-pink-500 text-white'
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

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {categoriaAtiva === 'Todas' ? 'Nosso Cardápio' : categoriaAtiva}
                </h2>
                <span className="text-xs text-pink-700 font-semibold bg-pink-100 px-3 py-1 rounded-full">
                  Feitos sob encomenda 🍰
                </span>
              </div>

              {/* Lista do Cardápio */}
              {loading ? (
                <p className="text-gray-500">Carregando delícias...</p>
              ) : bolosFiltrados.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border border-pink-100 shadow-sm">
                  <p className="text-gray-500 text-sm">Nenhum bolo encontrado para essa pesquisa ou categoria.</p>
                </div>
              ) : modoVisualizacao === 'grade' ? (
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bolosFiltrados.map((bolo) => (
                    <div key={bolo.id} className="bg-white rounded-xl shadow p-5 flex flex-col justify-between border border-pink-100 hover:shadow-md transition relative">
                      {bolo.destaque && (
                        <span className="absolute -top-2.5 -right-2 bg-amber-400 text-amber-950 font-bold text-[10px] px-3 py-1 rounded-full shadow-md border border-amber-200 flex items-center gap-1">
                          ⭐ Mais Vendido
                        </span>
                      )}

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
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              adicionarAoCarrinho(bolo);
                              if (window.innerWidth < 1024) {
                                setTimeout(() => RolarParaCarrinho(), 200);
                              }
                            }}
                            className="bg-pink-500 hover:bg-pink-600 text-white font-medium px-4 py-2 rounded-lg transition active:scale-95 shadow-sm"
                          >
                            + Encomendar
                          </button>

                          {isAdmin && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditarBolo(bolo)}
                                className="bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-bold px-2 py-2 rounded-lg"
                                title="Editar Produto"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeletarBolo(bolo.id)}
                                className="bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold px-2 py-2 rounded-lg"
                                title="Excluir Produto"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              ) : (

                <div className="bg-white rounded-xl shadow border border-pink-100 divide-y divide-gray-100">
                  {bolosFiltrados.map((bolo) => (
                    <div key={bolo.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-pink-50/50 transition">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-gray-800">{bolo.nome}</h3>
                          {bolo.destaque && (
                            <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-amber-200">
                              ⭐ Mais Vendido
                            </span>
                          )}
                          <span className="text-[10px] bg-pink-100 text-pink-600 font-semibold px-2 py-0.5 rounded-full">
                            {bolo.categoria}
                          </span>
                        </div>
                        {bolo.descricao && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{bolo.descricao}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="text-base font-bold text-pink-600">
                          R$ {bolo.preco.toFixed(2).replace('.', ',')}
                        </span>
                        
                        <button
                          onClick={() => {
                            adicionarAoCarrinho(bolo);
                            if (window.innerWidth < 1024) {
                              setTimeout(() => RolarParaCarrinho(), 200);
                            }
                          }}
                          className="bg-pink-500 hover:bg-pink-600 text-white font-medium text-xs px-3 py-2 rounded-lg transition active:scale-95 shadow-sm"
                        >
                          + Encomendar
                        </button>

                        {isAdmin && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditarBolo(bolo)}
                              className="bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-bold px-2 py-1.5 rounded-lg"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeletarBolo(bolo.id)}
                              className="bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold px-2 py-1.5 rounded-lg"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

              )}
            </div>

            {/* COLUNA DIREITA: SEÇÃO DO CARRINHO E CHECKOUT */}
            {carrinho.length > 0 && (
              <aside id="carrinho-secao" className="lg:col-span-1 lg:sticky lg:top-6 transition-all">
                <section className="bg-white rounded-2xl shadow-lg border border-pink-200 p-5">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 pb-3 border-b border-gray-100">
                    <span>🛒</span> Seus Encomendas ({totalItensCarrinho})
                  </h2>

                  <div className="divide-y divide-gray-100 mb-6 max-h-60 overflow-y-auto pr-1">
                    {carrinho.map((item) => (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm">{item.nome}</h4>
                          <p className="text-[11px] text-gray-500">
                            R$ {item.preco.toFixed(2).replace('.', ',')} un.
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 bg-pink-50 border border-pink-200 rounded-lg px-1.5 py-0.5">
                            <button
                              onClick={() => alterarQuantidade(item.id, -1)}
                              className="w-5 h-5 flex items-center justify-center font-bold text-pink-700 hover:bg-pink-200 rounded transition text-xs"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold text-gray-800 w-4 text-center">
                              {item.quantidade}
                            </span>
                            <button
                              onClick={() => alterarQuantidade(item.id, 1)}
                              className="w-5 h-5 flex items-center justify-center font-bold text-pink-700 hover:bg-pink-200 rounded transition text-xs"
                            >
                              +
                            </button>
                          </div>

                          <span className="font-bold text-pink-600 text-sm">
                            R$ {(item.preco * item.quantidade).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Formulário de Encomenda */}
                  <div className="bg-pink-50/50 p-4 rounded-xl border border-pink-100 space-y-3 mb-4">
                    <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                      📋 Dados do Agendamento
                    </h3>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Seu Nome *</label>
                        <input
                          type="text"
                          placeholder="Ex: Maria Silva"
                          value={nomeCliente}
                          onChange={(e) => setNomeCliente(e.target.value)}
                          className="w-full text-xs p-2 border rounded-lg focus:outline-none focus:border-pink-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Forma de Retirada/Entrega</label>
                        <select
                          value={formaEntrega}
                          onChange={(e) => setFormaEntrega(e.target.value)}
                          className="w-full text-xs p-2 border rounded-lg focus:outline-none focus:border-pink-500 bg-white"
                        >
                          <option value="entrega">Entrega (Redondezas - R$ 7,00)</option>
                          <option value="retirada">Retirada no Local (Sem Taxa)</option>
                        </select>
                      </div>

                      {formaEntrega === 'entrega' && (
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Endereço de Entrega *</label>
                          <input
                            type="text"
                            placeholder="Rua, Número e Bairro"
                            value={enderecoCliente}
                            onChange={(e) => setEnderecoCliente(e.target.value)}
                            className="w-full text-xs p-2 border rounded-lg focus:outline-none focus:border-pink-500 bg-white"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Data *</label>
                          <input
                            type="date"
                            value={dataDesejada}
                            onChange={(e) => setDataDesejada(e.target.value)}
                            className="w-full text-xs p-2 border rounded-lg focus:outline-none focus:border-pink-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Horário *</label>
                          <input
                            type="time"
                            value={horarioDesejado}
                            onChange={(e) => setHorarioDesejado(e.target.value)}
                            className="w-full text-xs p-2 border rounded-lg focus:outline-none focus:border-pink-500 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Forma de Pagamento</label>
                        <select
                          value={formaPagamento}
                          onChange={(e) => setFormaPagamento(e.target.value)}
                          className="w-full text-xs p-2 border rounded-lg focus:outline-none focus:border-pink-500 bg-white"
                        >
                          <option value="Pix">PIX Antecipado</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Cartão de Débito">Cartão de Débito</option>
                          <option value="Dinheiro">Dinheiro</option>
                        </select>
                      </div>

                      {formaPagamento === 'Dinheiro' && (
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Troco para quanto?</label>
                          <input
                            type="text"
                            placeholder="Ex: R$ 50,00"
                            value={precisaTroco}
                            onChange={(e) => setPrecisaTroco(e.target.value)}
                            className="w-full text-xs p-2 border rounded-lg focus:outline-none focus:border-pink-500 bg-white"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Observações</label>
                        <textarea
                          placeholder="Alguma restrição ou recado..."
                          value={observacoes}
                          onChange={(e) => setObservacoes(e.target.value)}
                          rows={2}
                          className="w-full text-xs p-2 border rounded-lg focus:outline-none focus:border-pink-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Totais e Botão de Finalizar */}
                  <div className="border-t border-gray-100 pt-3 flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Subtotal:</span>
                      <span>R$ {calcularSubtotal().toFixed(2).replace('.', ',')}</span>
                    </div>

                    {formaEntrega === 'entrega' && (
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Taxa de Entrega:</span>
                        <span>R$ {VALOR_TAXA_ENTREGA.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-base font-bold text-gray-800 pt-1.5 border-t">
                      <span>Total:</span>
                      <span className="text-pink-600">R$ {calcularTotal().toFixed(2).replace('.', ',')}</span>
                    </div>

                    <button
                      onClick={processarCheckout}
                      className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition shadow text-center flex items-center justify-center gap-2 text-sm active:scale-98 w-full"
                    >
                      <span>📱</span> Finalizar via WhatsApp
                    </button>
                  </div>
                </section>
              </aside>
            )}

          </div>

        </main>
      </div>

      {/* MODAL DO PIX */}
      {mostrarModalPix && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center border border-pink-100">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Pagamento via PIX</h3>
            <p className="text-xs text-gray-500 mb-4">
              Copie a chave PIX abaixo para efetuar o pagamento do valor total de <strong>R$ {calcularTotal().toFixed(2).replace('.', ',')}</strong>.
            </p>

            <div className="bg-pink-50 p-3 rounded-xl border border-pink-200 mb-4">
              <span className="text-xs font-semibold text-gray-500 block mb-1">Chave PIX (Aleatória)</span>
              <div className="text-xs font-mono font-bold text-pink-700 break-all select-all">
                {CHAVE_PIX}
              </div>
            </div>

            <button
              onClick={copiarChavePix}
              className="w-full bg-pink-100 hover:bg-pink-200 text-pink-800 font-bold py-2.5 rounded-xl text-sm transition mb-3 flex items-center justify-center gap-2"
            >
              <span>{chaveCopiada ? "✅ Copiado!" : "📋 Copiar Chave PIX"}</span>
            </button>

            <div className="text-xs text-gray-400 mb-4">
              Tempo sugerido para pagamento: <strong className="text-pink-600">{formatarTempo(tempoRestante)}</strong>
            </div>

            <p className="text-[11px] text-gray-500 mb-4 bg-amber-50 p-2 rounded-lg border border-amber-200">
              Após realizar o pagamento, clique no botão abaixo para enviar o comprovante e os detalhes do pedido pelo WhatsApp!
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={enviarPedidoWhatsApp}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition shadow"
              >
                Já fiz o pagamento / Enviar no WhatsApp
              </button>
              
              <button
                onClick={() => setMostrarModalPix(false)}
                className="w-full text-xs text-gray-400 hover:text-gray-600 py-1"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão Flutuante do Carrinho para Mobile */}
      {carrinho.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
          <button
            onClick={RolarParaCarrinho}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-5 rounded-2xl shadow-xl flex items-center justify-between border border-pink-400 animate-pulse"
          >
            <div className="flex items-center gap-2">
              <span className="bg-white text-pink-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">
                {totalItensCarrinho}
              </span>
              <span className="text-sm">Ver Minha Encomenda</span>
            </div>
            <span className="text-sm font-black">
              R$ {calcularTotal().toFixed(2).replace('.', ',')}
            </span>
          </button>
        </div>
      )}

      {/* Rodapé e Acesso Admin */}
      <footer className="bg-white border-t border-pink-100 py-6 text-center text-xs text-pink-900/60 mt-12 flex flex-col items-center gap-2">
        <p>Caseirinhos da Beth • Todos os direitos reservados</p>
        {!isAdmin && (
          <button 
            onClick={() => setMostrarModalLogin(true)} 
            className="text-[10px] text-gray-400 hover:text-pink-600 font-medium"
          >
            Área Restrita
          </button>
        )}
      </footer>

    </div>
  );
}
