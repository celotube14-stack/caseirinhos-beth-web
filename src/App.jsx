import React, { useState, useEffect } from 'react';
import { db, auth, storage } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
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
  const [email, setEmail] = useState('celotube14@gmail.com');
  const [senha, setSenha] = useState('');
  const [erroLogin, setErroLogin] = useState('');

  // Estados do Painel CRUD Admin
  const [boloEditando, setBoloEditando] = useState(null);
  const [nomeForm, setNomeForm] = useState('');
  const [precoForm, setPrecoForm] = useState('');
  const [categoriaForm, setCategoriaForm] = useState('Bolos Tradicionais');
  const [descricaoForm, setDescricaoForm] = useState('');
  const [arquivoImagem, setArquivoImagem] = useState(null);
  const [enviandoImagem, setEnviandoImagem] = useState(false);

  // Filtros, Busca e Layout de Visualização
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

  // Modal do PIX e Temporizador (5 Minutos)
  const [mostrarModalPix, setMostrarModalPix] = useState(false);
  const [chaveCopiada, setChaveCopiada] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(300); // 300 segundos = 5 minutos

  const NUMERO_WHATSAPP = "5511996808580"; 
  const CHAVE_PIX = "b765a02d-19ad-4eae-8c5c-da574b0c2b9b";

  // Monitora Autenticação Admin
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (usuarioAtual) => {
      setUser(usuarioAtual);
    });
    return () => unsubscribeAuth();
  }, []);

  // Controla a contagem regressiva de 5 minutos do PIX
  useEffect(() => {
    let timer;
    if (mostrarModalPix && tempoRestante > 0) {
      timer = setInterval(() => {
        setTempoRestante((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mostrarModalPix, tempoRestante]);

  // Formata o tempo restante (segundos) em MM:SS
  const formatarTempo = (segundos) => {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
  };

  const reiniciarTempoPix = () => {
    setTempoRestante(300);
  };

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

  // Busca do Firestore EM TEMPO REAL (onSnapshot)
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
            imageUrl: data.imageUrl || data.Imagem || "",
            ativo: data.Ativo !== undefined ? data.Ativo : (data.ativo !== undefined ? data.ativo : true),
          });
        });
        setBolos(listaBolos);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao escutar alterações do cardápio:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Autenticação Admin via E-mail/Senha
  const handleLogin = async (e) => {
    e.preventDefault();
    setErroLogin('');
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      setMostrarModalLogin(false);
      setSenha('');
      exibirToast("Login de Admin efetuado com sucesso!");
    } catch (error) {
      console.error(error);
      setErroLogin("E-mail ou senha incorretos.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    exibirToast("Você saiu do modo Admin.");
  };

  // Funções CRUD do Painel Admin
  const handleUploadImagem = async (file) => {
    if (!file) return "";
    setEnviandoImagem(true);
    try {
      const storageRef = ref(storage, `bolos/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setEnviandoImagem(false);
      return url;
    } catch (error) {
      console.error("Erro no upload:", error);
      setEnviandoImagem(false);
      return "";
    }
  };

  const handleSalvarBolo = async (e) => {
    e.preventDefault();
    if (!nomeForm || !precoForm) {
      alert("Preencha o nome e o preço.");
      return;
    }

    let urlFinal = boloEditando ? boloEditando.imageUrl : "";
    if (arquivoImagem) {
      urlFinal = await handleUploadImagem(arquivoImagem);
    }

    const dadosBolo = {
      nome: nomeForm,
      preco: parseFloat(precoForm),
      categoria: categoriaForm,
      descricao: descricaoForm,
      imageUrl: urlFinal,
      ativo: true
    };

    try {
      if (boloEditando) {
        await updateDoc(doc(db, "bolos", boloEditando.id), dadosBolo);
        exibirToast("Produto atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "bolos"), dadosBolo);
        exibirToast("Novo produto cadastrado!");
      }
      resetFormAdmin();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar produto no banco.");
    }
  };

  const handleEditarBolo = (bolo) => {
    setBoloEditando(bolo);
    setNomeForm(bolo.nome);
    setPrecoForm(bolo.preco);
    setCategoriaForm(bolo.categoria || "Bolos Tradicionais");
    setDescricaoForm(bolo.descricao || "");
  };

  const handleDeletarBolo = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este produto do cardápio?")) {
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
    setArquivoImagem(null);
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

  const validarFormulario = () => {
    if (!nomeCliente.trim()) {
      alert("Por favor, digite seu nome antes de enviar o pedido.");
      return false;
    }
    if (formaEntrega === 'entrega' && !enderecoCliente.trim()) {
      alert("Por favor, digite seu endereço de entrega.");
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
    <div className="min-h-screen bg-pink-50 font-sans pb-24 md:pb-12 relative">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-xl border border-gray-700 animate-bounce">
          ✨ {toastMsg}
        </div>
      )}

      {/* Header Estilizado */}
      <header className="bg-amber-50/80 text-center py-10 px-4 shadow-sm border-b border-pink-100 relative overflow-hidden">
        
        {/* Botão de Login Admin Discreto no Canto Superior */}
        <div className="absolute top-3 right-4 z-10">
          {isAdmin ? (
            <div className="flex items-center gap-2 bg-white/80 px-3 py-1 rounded-full border border-pink-200 shadow-sm">
              <span className="text-xs font-bold text-pink-700">Admin</span>
              <button onClick={handleLogout} className="text-xs text-red-600 hover:underline font-semibold">Sair</button>
            </div>
          ) : (
            <button
              onClick={() => setMostrarModalLogin(true)}
              className="text-xs text-pink-900/60 hover:text-pink-900 font-semibold flex items-center gap-1 bg-white/40 hover:bg-white/80 px-2.5 py-1 rounded-full transition"
            >
              🔒 Restrito
            </button>
          )}
        </div>

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

      {/* Modal / Janela Flutuante de Login Admin */}
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
              <p className="text-xs bg-red-50 text-red-600 p-2 rounded-lg mb-3 border border-red-100 font-semibold">
                {erroLogin}
              </p>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
                <input
                  type="email"
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

      <main className="max-w-6xl mx-auto p-6">

        {/* PAINEL ADMIN: Cadastrar/Editar Produto (Exibido somente quando Admin estiver logado) */}
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
                className="text-sm p-2.5 border border-pink-200 rounded-lg focus:outline-none focus:border-pink-500 bg-white"
              >
                {categorias.filter(c => c !== "Todas").map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setArquivoImagem(e.target.files[0])}
                className="text-sm p-2 border border-pink-200 rounded-lg"
              />

              <textarea
                placeholder="Descrição dos ingredientes..."
                value={descricaoForm}
                onChange={(e) => setDescricaoForm(e.target.value)}
                rows={2}
                className="md:col-span-2 text-sm p-2.5 border border-pink-200 rounded-lg focus:outline-none focus:border-pink-500"
              />

              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={enviandoImagem}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition shadow"
                >
                  {enviandoImagem ? "Salvando foto..." : boloEditando ? "Atualizar Bolo" : "Cadastrar Bolo"}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Seção Principal do Cardápio */}
          <section className="md:col-span-2">
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="🔍 Buscar por sabor (ex: Nutella, Cenoura, Milho)..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white shadow-sm"
              />
            </div>

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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {bolosFiltrados.map((bolo) => (
                  <div key={bolo.id} className="bg-white rounded-xl shadow p-5 flex flex-col justify-between border border-pink-100 hover:shadow-md transition">
                    <div>
                      {bolo.imageUrl && (
                        <img 
                          src={bolo.imageUrl} 
                          alt={bolo.nome} 
                          className="w-full h-36 object-cover rounded-lg mb-3"
                        />
                      )}
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
                          onClick={() => adicionarAoCarrinho(bolo)}
                          className="bg-pink-500 hover:bg-pink-600 text-white font-medium px-4 py-2 rounded-lg transition active:scale-95 shadow-sm"
                        >
                          + Adicionar
                        </button>

                        {/* Botões de Ação Admin no Card */}
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
                        onClick={() => adicionarAoCarrinho(bolo)}
                        className="bg-pink-500 hover:bg-pink-600 text-white font-medium text-xs px-3 py-2 rounded-lg transition active:scale-95 shadow-sm"
                      >
                        + Adicionar
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
                      <option value="Pix">Pix (Pagamento Antecipado)</option>
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
                    onClick={processarCheckout}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm active:scale-95"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                    </svg>
                    {formaPagamento === 'Pix' ? 'Pagar via PIX e Finalizar' : 'Enviar Pedido no WhatsApp'}
                  </button>
                </div>
              </div>
            )}
          </aside>

        </div>
      </main>

      {/* Modal / Janela Flutuante do PIX com Timer de 5 Minutos */}
      {mostrarModalPix && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-pink-100 animate-fadeIn">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="text-xl font-bold text-gray-800">Pagamento via PIX</h3>
              <button 
                onClick={() => setMostrarModalPix(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Contador Regressivo de 5 Minutos */}
            <div className={`mt-3 p-2.5 rounded-xl text-center text-sm font-bold border transition ${
              tempoRestante > 60 
                ? 'bg-amber-50 text-amber-800 border-amber-200' 
                : 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
            }`}>
              {tempoRestante > 0 ? (
                <span>⏰ Tempo restante para pagamento: <strong className="text-base">{formatarTempo(tempoRestante)}</strong></span>
              ) : (
                <span>⚠️ Tempo limite para realizar o PIX expirou!</span>
              )}
            </div>

            <div className="my-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Valor Total a Pagar:</p>
              <p className="text-3xl font-extrabold text-pink-600">
                R$ {calcularTotal().toFixed(2).replace('.', ',')}
              </p>

              {/* QR Code Dinâmico */}
              <div className="my-4 flex justify-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(CHAVE_PIX)}`}
                  alt="QR Code PIX"
                  className={`p-2 border rounded-xl shadow-sm bg-white transition ${
                    tempoRestante === 0 ? 'opacity-20 grayscale' : 'border-pink-200'
                  }`}
                />
              </div>

              <p className="text-xs text-gray-500 mb-2">Escaneie o QR Code acima ou copie a Chave Aleatória abaixo:</p>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs font-mono break-all text-gray-700 flex items-center justify-between gap-2">
                <span>{CHAVE_PIX}</span>
              </div>

              <button
                onClick={copiarChavePix}
                disabled={tempoRestante === 0}
                className="mt-3 w-full bg-pink-100 hover:bg-pink-200 text-pink-700 font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chaveCopiada ? '✅ Chave Copiada!' : '📋 Copiar Chave PIX'}
              </button>
            </div>

            <div className="border-t pt-4 space-y-2">
              <p className="text-xs text-center text-amber-700 bg-amber-50 p-2.5 rounded-lg font-medium border border-amber-200">
                ⚠️ Após efetuar o PIX na Caixa, clique no botão abaixo para enviar o pedido com o comprovante no WhatsApp.
              </p>

              {tempoRestante > 0 ? (
                <button
                  onClick={enviarPedidoWhatsApp}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md active:scale-95"
                >
                  Enviar Pedido e Comprovante no WhatsApp
                </button>
              ) : (
                <button
                  onClick={reiniciarTempoPix}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md active:scale-95"
                >
                  🔄 Tentar Novamente / Recarregar Tempo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
