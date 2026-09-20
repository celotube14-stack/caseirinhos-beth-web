import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [loadingInicial, setLoadingInicial] = useState(true);

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
  const [cepCliente, setCepCliente] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [enderecoCliente, setEnderecoCliente] = useState('');
  const [numeroCliente, setNumeroCliente] = useState('');
  const [complementoCliente, setComplementoCliente] = useState('');
  const [formaEntrega, setFormaEntrega] = useState('entrega');
  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [precisaTroco, setPrecisaTroco] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [dataDesejada, setDataDesejada] = useState('');
  const [horarioDesejado, setHorarioDesejado] = useState('');

  const VALOR_TAXA_ENTREGA = 7.90;

  // Modal do PIX
  const [mostrarModalPix, setMostrarModalPix] = useState(false);
  const [chaveCopiada, setChaveCopiada] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(300);

  const NUMERO_WHATSAPP = "5511996808580"; 
  const CHAVE_PIX = "b765a02d-19ad-4eae-8c5c-da574b0c2b9b";

  // Loading de abertura (animação de entrada)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingInicial(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

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

  // Busca do CEP via API ViaCEP
  const buscarCep = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, '');
    setCepCliente(cepLimpo);

    if (cepLimpo.length === 8) {
      setBuscandoCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setEnderecoCliente(`${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`);
          exibirToast("Endereço encontrado!");
        } else {
          exibirToast("CEP não encontrado.");
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
        exibirToast("Erro ao buscar CEP.");
      } finally {
        setBuscandoCep(false);
      }
    }
  };

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
      return [...prev, { ...bolo, quantidade: 1, comGranulado: true }];
    });
    exibirToast(`"${bolo.nome}" adicionado ao pedido!`);
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

  const alterarGranulado = (id, valor) => {
    setCarrinho((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, comGranulado: valor } : item
      )
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
    let atendeCategoria = false;
    if (categoriaAtiva === 'Todas') {
      atendeCategoria = true;
    } else if (categoriaAtiva === 'Mais Vendidos') {
      atendeCategoria = b.destaque === true;
    } else {
      atendeCategoria = b.categoria.toLowerCase() === categoriaAtiva.toLowerCase();
    }
    const atendeBusca = b.nome.toLowerCase().includes(busca.toLowerCase()) || b.descricao.toLowerCase().includes(busca.toLowerCase());
    return atendeCategoria && atendeBusca;
  });

  const validarFormulario = () => {
    if (!nomeCliente.trim()) {
      alert("Por favor, digite seu nome antes de enviar o pedido.");
      return false;
    }
    if (formaEntrega === 'entrega') {
      if (!enderecoCliente.trim()) {
        alert("Por favor, preencha o CEP e o endereço de entrega.");
        return false;
      }
      if (!numeroCliente.trim()) {
        alert("Por favor, digite o número do imóvel.");
        return false;
      }
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
      mensagem += `*CEP:* ${cepCliente}\n`;
      mensagem += `*Endereço:* ${enderecoCliente}, Nº ${numeroCliente}${complementoCliente ? ` (${complementoCliente})` : ''}\n`;
    }
    
    mensagem += `\n*Itens Encomendados:*\n`;
    carrinho.forEach((item) => {
      let opcaoGranulado = "";
      if (item.nome.toLowerCase().includes('cenoura')) {
        opcaoGranulado = item.comGranulado ? " *(Com Granulado)*" : " *(SEM Granulado)*";
      }

      mensagem += `• ${item.quantidade}x ${item.nome}${opcaoGranulado} (R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')})\n`;
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

  const categorias = ["Todas", "Mais Vendidos", "Bolos Tradicionais", "Bolos Especiais", "Bolos com Cobertura"];
  const isAdmin = user && user.email === "celotube14@gmail.com";

  // TELA DE LOADING ANIMAÇÃO
  if (loadingInicial) {
    return (
      <div className="fixed inset-0 bg-pink-50 flex flex-col items-center justify-center z-50 p-4">
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-24 h-24 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
          <span className="absolute text-4xl animate-bounce">🍰</span>
        </div>

        <h1 
          className="text-3xl font-normal tracking-wide text-center"
          style={{ fontFamily: "'Pacifico', cursive", color: '#4a1d0d' }}
        >
          Caseirinhos da Beth
        </h1>

        <p className="text-pink-800 text-xs font-semibold tracking-wider mt-2 animate-pulse">
          Preparando as delícias para você...
        </p>
      </div>
    );
  }

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
          
          {isAdmin ? (
            <div className="absolute top-3 right-4 z-10 flex items-center gap-2 bg-white/90 px-3 py-1 rounded-full border border-pink-200 shadow-sm">
              <span className="text-xs font-bold text-pink-700">Admin Ativo</span>
              <button onClick={handleLogout} className="text-xs text-red-600 hover:underline font-semibold">Sair</button>
            </div>
          ) : (
            <button 
              onClick={() => setMostrarModalLogin(true)} 
              className="absolute top-3 right-4 text-xs font-semibold text-gray-500 hover:text-pink-600 transition"
            >
              🔒 Área Restrita
            </button>
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

            {/* BOTÃO EM DESTAQUE DO INSTAGRAM */}
            <a 
              href="https://www.instagram.com/beth.caseirinhos/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-4 bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 text-white text-xs md:text-sm font-bold px-5 py-2 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span>Siga no Instagram @beth.caseirinhos</span>
            </a>

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
                  {categorias.filter(c => c !== "Todas" && c !== "Mais Vendidos").map(c => (
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

          {/* ESTRUTURA PRINCIPAL EM GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* COLUNA ESQUERDA: CARDÁPIO */}
            <div className={carrinho.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
              
              {/* Filtros de Categorias */}
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
                    {cat === 'Mais Vendidos' ? `⭐ ${cat}` : cat}
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

              {/* Lista do Cardápio com Animação */}
              {loading ? (
                <p className="text-gray-500">Carregando delícias...</p>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${categoriaAtiva}-${busca}-${modoVisualizacao}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  >
                    {bolosFiltrados.length === 0 ? (
                      <div className="bg-white rounded-xl p-8 text-center border border-pink-100 shadow-sm">
                        <p className="text-gray-500 text-sm">
                          Nenhum bolo encontrado para essa pesquisa ou categoria.
                        </p>
                      </div>
                    ) : modoVisualizacao === 'grade' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {bolosFiltrados.map((bolo) => (
                          <div
                            key={bolo.id}
                            className="bg-white rounded-xl shadow p-5 flex flex-col justify-between border border-pink-100 hover:shadow-md transition relative"
                          >
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
                                  R$ {Number(bolo.preco).toFixed(2).replace('.', ',')}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => adicionarAoCarrinho(bolo)}
                                  className="bg-pink-500 hover:bg-pink-600 text-white font-medium px-4 py-2 rounded-lg transition active:scale-95 shadow-sm text-sm"
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
                          <div
                            key={bolo.id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-pink-50/50 transition"
                          >
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
                                R$ {Number(bolo.preco).toFixed(2).replace('.', ',')}
                              </span>

                              <button
                                onClick={() => adicionarAoCarrinho(bolo)}
                                className="bg-pink-500 hover:bg-pink-600 text-white font-medium text-xs px-3 py-2 rounded-lg transition active:scale-95 shadow-sm"
                              >
                                + Encomendar
                              </button>

                              {isAdmin && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditarBolo(bolo)}
                                    className="bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-bold px-2 py-1.5 rounded-lg"
                                    title="Editar Produto"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDeletarBolo(bolo.id)}
                                    className="bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold px-2 py-1.5 rounded-lg"
                                    title="Excluir Produto"
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
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* COLUNA DIREITA: CARRINHO */}
            {carrinho.length > 0 && (
              <div id="carrinho-secao" className="lg:col-span-1 bg-white p-5 rounded-2xl shadow-lg border border-pink-200 sticky top-6">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span>🛒</span> Seu Pedido
                  </h3>
                  <span className="text-xs font-semibold bg-pink-100 text-pink-700 px-2.5 py-1 rounded-full">
                    {totalItensCarrinho} {totalItensCarrinho === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                {/* Itens do Carrinho */}
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {carrinho.map((item) => (
                    <div key={item.id} className="bg-pink-50/50 p-3 rounded-xl border border-pink-100 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-gray-800">{item.nome}</h4>
                          <span className="text-xs font-semibold text-pink-600">
                            R$ {(item.preco * item.quantidade).toFixed(2).replace('.', ',')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 bg-white border border-pink-200 rounded-lg p-0.5 shadow-sm">
                          <button
                            onClick={() => alterarQuantidade(item.id, -1)}
                            className="w-6 h-6 text-xs font-bold text-gray-600 hover:bg-pink-100 rounded flex items-center justify-center transition"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold px-1.5">{item.quantidade}</span>
                          <button
                            onClick={() => alterarQuantidade(item.id, 1)}
                            className="w-6 h-6 text-xs font-bold text-gray-600 hover:bg-pink-100 rounded flex items-center justify-center transition"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Bloco Granulado idêntico ao modelo */}
                      {item.nome.toLowerCase().includes('cenoura') && (
                        <div className="mt-3 p-3 bg-amber-50/70 rounded-2xl border-2 border-amber-200 shadow-sm space-y-2.5">
                          <div>
                            <span className="text-xs font-bold text-gray-900 block flex items-center gap-1">
                              ✨ Deseja granulado por cima?
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">
                              (A escolha não altera o valor do produto)
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => alterarGranulado(item.id, true)}
                              className={`py-2 px-3 rounded-xl text-xs font-bold transition shadow-sm ${
                                item.comGranulado 
                                  ? 'bg-amber-500 text-white shadow' 
                                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              Com Granulado
                            </button>
                            <button
                              type="button"
                              onClick={() => alterarGranulado(item.id, false)}
                              className={`py-2 px-3 rounded-xl text-xs font-bold transition shadow-sm ${
                                !item.comGranulado 
                                  ? 'bg-amber-500 text-white shadow' 
                                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              Sem Granulado
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Formulário de Encomenda & Endereço */}
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Seu Nome *</label>
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={nomeCliente}
                      onChange={(e) => setNomeCliente(e.target.value)}
                      className="w-full text-xs p-2 border border-pink-200 rounded-lg focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Data Desejada *</label>
                      <input
                        type="date"
                        value={dataDesejada}
                        onChange={(e) => setDataDesejada(e.target.value)}
                        className="w-full text-xs p-2 border border-pink-200 rounded-lg focus:outline-none focus:border-pink-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Horário *</label>
                      <input
                        type="time"
                        value={horarioDesejado}
                        onChange={(e) => setHorarioDesejado(e.target.value)}
                        className="w-full text-xs p-2 border border-pink-200 rounded-lg focus:outline-none focus:border-pink-500 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Forma de Recebimento</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormaEntrega('entrega')}
                        className={`text-xs py-2 rounded-lg font-bold border transition ${
                          formaEntrega === 'entrega'
                            ? 'bg-pink-600 text-white border-pink-600'
                            : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        🚚 Entrega
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormaEntrega('retirada')}
                        className={`text-xs py-2 rounded-lg font-bold border transition ${
                          formaEntrega === 'retirada'
                            ? 'bg-pink-600 text-white border-pink-600'
                            : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        🏬 Retirada
                      </button>
                    </div>
                  </div>

                  {formaEntrega === 'entrega' && (
                    <div className="space-y-2 bg-pink-50/40 p-3 rounded-xl border border-pink-100">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-0.5">CEP de Entrega *</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={9}
                            placeholder="00000-000"
                            value={cepCliente}
                            onChange={(e) => buscarCep(e.target.value)}
                            className="flex-1 text-xs p-2 border border-pink-200 rounded-lg focus:outline-none focus:border-pink-500"
                          />
                          {buscandoCep && <span className="text-xs text-pink-600 animate-pulse self-center">Buscando...</span>}
                        </div>
                      </div>

                      {enderecoCliente && (
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-0.5">Endereço</label>
                          <input
                            type="text"
                            value={enderecoCliente}
                            onChange={(e) => setEnderecoCliente(e.target.value)}
                            className="w-full text-xs p-2 border border-pink-200 rounded-lg focus:outline-none focus:border-pink-500 bg-white"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-0.5">Número *</label>
                          <input
                            type="text"
                            placeholder="Nº"
                            value={numeroCliente}
                            onChange={(e) => setNumeroCliente(e.target.value)}
                            className="w-full text-xs p-2 border border-pink-200 rounded-lg focus:outline-none focus:border-pink-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-0.5">Complemento</label>
                          <input
                            type="text"
                            placeholder="Apt / Bloco"
                            value={complementoCliente}
                            onChange={(e) => setComplementoCliente(e.target.value)}
                            className="w-full text-xs p-2 border border-pink-200 rounded-lg focus:outline-none focus:border-pink-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Forma de Pagamento</label>
                    <select
                      value={formaPagamento}
                      onChange={(e) => setFormaPagamento(e.target.value)}
                      className="w-full text-xs p-2 border border-pink-200 rounded-lg focus:outline-none focus:border-pink-500 bg-white"
                    >
                      <option value="Pix">Pix (Antecipado)</option>
                      <option value="Cartão de Crédito">Cartão de Crédito na Entrega/Retirada</option>
                      <option value="Cartão de Débito">Cartão de Débito na Entrega/Retirada</option>
                      <option value="Dinheiro">Dinheiro</option>
                    </select>
                  </div>

                  {formaPagamento === 'Dinheiro' && (
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-0.5">Troco para quanto?</label>
                      <input
                        type="text"
                        placeholder="Ex: R$ 50,00 ou Não preciso"
                        value={precisaTroco}
                        onChange={(e) => setPrecisaTroco(e.target.value)}
                        className="w-full text-xs p-2 border border-pink-200 rounded-lg focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Observações</label>
                    <textarea
                      placeholder="Ex: Sem açúcar, cartão de parabéns..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      rows={2}
                      className="w-full text-xs p-2 border border-pink-200 rounded-lg focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                {/* Resumo de Valores */}
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>R$ {calcularSubtotal().toFixed(2).replace('.', ',')}</span>
                  </div>
                  {formaEntrega === 'entrega' && (
                    <div className="flex justify-between text-gray-600">
                      <span>Taxa de Entrega:</span>
                      <span>R$ {VALOR_TAXA_ENTREGA.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base text-pink-700 pt-2 border-t border-gray-100">
                    <span>Total:</span>
                    <span>R$ {calcularTotal().toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                {/* Botão de Enviar */}
                <button
                  onClick={processarCheckout}
                  className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs md:text-sm shadow-md transition flex items-center justify-center gap-2"
                >
                  <span>💬</span> Enviar Encomenda pelo WhatsApp
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal Pix */}
      {mostrarModalPix && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-pink-100 text-center space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <span>⚡</span> Pagamento via PIX
              </h3>
              <button
                onClick={() => setMostrarModalPix(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Para confirmar a sua encomenda, realize o pagamento no valor total de:
            </p>

            <div className="text-2xl font-black text-pink-600 bg-pink-50 py-2 rounded-xl border border-pink-100">
              R$ {calcularTotal().toFixed(2).replace('.', ',')}
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-2.5 rounded-xl font-semibold">
              ⏳ Tempo para pagamento: <span className="font-bold">{formatarTempo(tempoRestante)}</span>
            </div>

            <div className="space-y-2 pt-1">
              <label className="block text-[11px] font-bold text-gray-500 uppercase">Chave PIX (Copia e Cola):</label>
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                <input
                  type="text"
                  readOnly
                  value={CHAVE_PIX}
                  className="text-xs font-mono text-gray-700 bg-transparent flex-1 focus:outline-none"
                />
                <button
                  onClick={copiarChavePix}
                  className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                >
                  {chaveCopiada ? "Copiado! ✓" : "Copiar"}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 italic">
              Após realizar o pagamento, clique no botão abaixo para nos enviar os dados e o comprovante pelo WhatsApp.
            </p>

            <button
              onClick={enviarPedidoWhatsApp}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition shadow flex items-center justify-center gap-2"
            >
              <span>💬</span> Já fiz o PIX, enviar pelo WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-xs text-pink-900/60 border-t border-pink-100 bg-amber-50/30">
        <p>Caseirinhos da Beth © {new Date().getFullYear()} - Todos os direitos reservados</p>
      </footer>
    </div>
  );
}
