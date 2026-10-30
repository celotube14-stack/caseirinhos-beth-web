import React, { useState, useEffect, useRef } from 'react';
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
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingInicial, setLoadingInicial] = useState(true);

  // Referências para rolagem suave
  const cardapioRef = useRef(null);
  const carrinhoRef = useRef(null);

  // Autenticação Admin & Modal Login
  const [user, setUser] = useState(null);
  const [mostrarModalLogin, setMostrarModalLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erroLogin, setErroLogin] = useState('');

  // Aba ativa do Admin: 'pedidos', 'clientes' ou 'cardapio'
  const [abaAdmin, setAbaAdmin] = useState('pedidos');

  // Estados do Painel CRUD Admin
  const [boloEditando, setBoloEditando] = useState(null);
  const [nomeForm, setNomeForm] = useState('');
  const [precoForm, setPrecoForm] = useState('');
  const [categoriaForm, setCategoriaForm] = useState('Bolos Tradicionais');
  const [descricaoForm, setDescricaoForm] = useState('');
  const [destaqueForm, setDestaqueForm] = useState(false);
  const [novidadeForm, setNovidadeForm] = useState(false);
  const [novidadeDataForm, setNovidadeDataForm] = useState(null);

  // Filtros, Busca e Layout
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');
  const [busca, setBusca] = useState('');

  // Status de Funcionamento
  const [lojaAberta, setLojaAberta] = useState(true);

  // Toast Notificação
  const [toastMsg, setToastMsg] = useState('');

  // Checkout & Agendamento
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
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

  // Loading de abertura
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

  // Checar horário e sugerir data para o dia seguinte se estiver fechado
  useEffect(() => {
    const checarHorario = () => {
      const horaAtual = new Date().getHours();
      const aberta = horaAtual >= 8 && horaAtual < 21;
      setLojaAberta(aberta);

      if (!dataDesejada) {
        const amanha = new Date();
        if (!aberta) {
          amanha.setDate(amanha.getDate() + 1);
        }
        setDataDesejada(amanha.toISOString().split('T')[0]);
      }
    };
    checarHorario();
    const interval = setInterval(checarHorario, 60000);
    return () => clearInterval(interval);
  }, [dataDesejada]);

  // Escutar produtos (Bolos) com expiração de 15 dias para novidades
  useEffect(() => {
    setLoading(true);
    const bolosRef = collection(db, "bolos");

    const unsubscribe = onSnapshot(
      bolosRef,
      (querySnapshot) => {
        const listaBolos = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          let isNovidade = data.Novidade || data.novidade || false;
          const novidadeDataStr = data.novidadeData || data.NovidadeData;

          if (isNovidade && novidadeDataStr) {
            const diffTime = new Date() - new Date(novidadeDataStr);
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            if (diffDays > 15) {
              isNovidade = false;
            }
          }

          listaBolos.push({
            id: doc.id,
            nome: data.Nome || data.nome || "Bolo sem nome",
            preco: parseFloat(data.Preço || data.preco || data.Preco) || 0,
            categoria: data.Categoria || data.categoria || "Geral",
            descricao: data.Descrição || data.descricao || data.Descricao || "",
            destaque: data.Destaque || data.destaque || false,
            novidade: isNovidade,
            novidadeData: novidadeDataStr,
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

  // Escutar Pedidos (Orders) em Tempo Real para o Admin
  useEffect(() => {
    if (!user) return;

    const ordersRef = collection(db, "orders");
    const unsubscribeOrders = onSnapshot(ordersRef, (snapshot) => {
      const listaPedidos = [];
      snapshot.forEach((docSnap) => {
        listaPedidos.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      listaPedidos.sort((a, b) => new Date(b.dataCriacao || 0) - new Date(a.dataCriacao || 0));
      setPedidos(listaPedidos);
    }, (err) => {
      console.error("Erro ao carregar pedidos:", err);
    });

    return () => unsubscribeOrders();
  }, [user]);

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

    let finalNovidadeData = novidadeDataForm;
    if (novidadeForm && !novidadeDataForm) {
      finalNovidadeData = new Date().toISOString();
    } else if (!novidadeForm) {
      finalNovidadeData = null;
    }

    const dadosBolo = {
      nome: nomeForm,
      Preço: parseFloat(precoForm),
      preco: parseFloat(precoForm),
      categoria: categoriaForm,
      descricao: descricaoForm,
      Destaque: destaqueForm,
      destaque: destaqueForm,
      Novidade: novidadeForm,
      novidade: novidadeForm,
      novidadeData: finalNovidadeData,
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
    setNovidadeForm(bolo.novidade !== undefined ? bolo.novidade : (bolo.Novidade || false));
    setNovidadeDataForm(bolo.novidadeData || null);
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

  const handleAtualizarStatusPedido = async (pedidoId, novoStatus) => {
    try {
      const pRef = doc(db, "orders", pedidoId);
      await updateDoc(pRef, { status: novoStatus });
      exibirToast(`Status alterado para "${novoStatus}"`);
    } catch (err) {
      console.error("Erro ao atualizar pedido:", err);
    }
  };

  const resetFormAdmin = () => {
    setBoloEditando(null);
    setNomeForm('');
    setPrecoForm('');
    setCategoriaForm('Bolos Tradicionais');
    setDescricaoForm('');
    setDestaqueForm(false);
    setNovidadeForm(false);
    setNovidadeDataForm(null);
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

    setTimeout(() => {
      if (carrinhoRef.current) {
        carrinhoRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
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

  const bolosNovidades = bolos.filter((b) => b.ativo && b.novidade);

  const validarFormulario = () => {
    if (!nomeCliente.trim()) {
      alert("Por favor, digite seu nome antes de enviar o pedido.");
      return false;
    }
    if (!telefoneCliente.trim()) {
      alert("Por favor, digite seu WhatsApp/Telefone para contato.");
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

  const salvarPedidoFirestore = () => {
    const totalPedido = calcularTotal();
    addDoc(collection(db, "orders"), {
      cliente: nomeCliente,
      telefone: telefoneCliente,
      dataEncomenda: dataDesejada,
      horarioEncomenda: horarioDesejado,
      formaEntrega: formaEntrega,
      cep: cepCliente || '',
      endereco: enderecoCliente || '',
      numero: numeroCliente || '',
      complemento: complementoCliente || '',
      itens: carrinho,
      subtotal: calcularSubtotal(),
      taxaEntrega: formaEntrega === 'entrega' ? VALOR_TAXA_ENTREGA : 0,
      total: totalPedido,
      formaPagamento: formaPagamento,
      trocoPara: precisaTroco || '',
      observacoes: observacoes || '',
      status: 'Pendente',
      dataCriacao: new Date().toISOString()
    }).catch((e) => {
      console.error("Erro ao gravar pedido no Firestore:", e);
    });
  };

  const gerarMensagemWhatsApp = () => {
    const totalPedido = calcularTotal();
    let mensagem = `*Novo Pedido (Sob Encomenda) - Caseirinhos da Beth*\n\n`;
    mensagem += `*Cliente:* ${nomeCliente}\n`;
    mensagem += `*WhatsApp:* ${telefoneCliente}\n`;
    mensagem += `*Data para Encomenda:* ${dataDesejada ? dataDesejada.split('-').reverse().join('/') : ''} às ${horarioDesejado}\n`;
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

    mensagem += `*Total Geral:* R$ ${totalPedido.toFixed(2).replace('.', ',')}\n`;
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

    return mensagem;
  };

  const processarCheckout = () => {
    if (!validarFormulario()) return;

    if (formaPagamento === 'Pix') {
      setTempoRestante(300);
      setMostrarModalPix(true);
    } else {
      salvarPedidoFirestore();
      const url = `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${encodeURIComponent(gerarMensagemWhatsApp())}`;
      window.location.href = url;
    }
  };

  const copiarChavePix = () => {
    navigator.clipboard.writeText(CHAVE_PIX);
    setChaveCopiada(true);
    setTimeout(() => setChaveCopiada(false), 3000);
  };

  const categorias = [
    "Todas",
    "Mais Vendidos",
    "Bolos Tradicionais",
    "Bolos Especiais",
    "Bolos com Cobertura",
    "Mini Bolo Vulcão"
  ];

  const isAdmin = user && user.email === "celotube14@gmail.com";

  const pedidosConcluidos = pedidos.filter(p => p.status === 'Concluído');
  const faturamentoTotal = pedidosConcluidos.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
  const ticketMedio = pedidosConcluidos.length > 0 ? (faturamentoTotal / pedidosConcluidos.length) : 0;

  const clientesMap = {};
  pedidos.forEach(p => {
    const telKey = p.telefone || p.cliente;
    if (!clientesMap[telKey]) {
      clientesMap[telKey] = {
        nome: p.cliente,
        telefone: p.telefone || 'Não informado',
        totalPedidos: 0,
        valorGasto: 0,
        ultimoPedido: p.dataEncomenda
      };
    }
    clientesMap[telKey].totalPedidos += 1;
    clientesMap[telKey].valorGasto += parseFloat(p.total || 0);
  });
  const listaClientes = Object.values(clientesMap);

  if (loadingInicial) {
    return (
      <div className="fixed inset-0 bg-pink-50 flex flex-col items-center justify-center z-50 p-4">
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-24 h-24 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
          <span className="absolute text-4xl animate-bounce">🍰</span>
        </div>
        <h1 className="text-3xl font-normal tracking-wide text-center" style={{ fontFamily: "'Pacifico', cursive", color: '#4a1d0d' }}>
          Caseirinhos da Beth
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-50/50 font-sans pb-24 md:pb-12 relative flex flex-col justify-between">
      <div>
        {toastMsg && (
          <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl border border-gray-700 animate-bounce">
            ✨ {toastMsg}
          </div>
        )}

        <header className="bg-amber-50/90 text-center py-10 px-4 shadow-sm border-b border-pink-100 relative overflow-hidden">
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
            <h1 className="text-5xl md:text-6xl font-normal leading-tight tracking-wide drop-shadow-sm select-none" style={{ fontFamily: "'Pacifico', cursive", color: '#4a1d0d' }}>
              Caseirinhos
            </h1>
            <div className="flex items-center justify-center gap-2 -mt-3 relative">
              <span className="text-2xl md:text-3xl" style={{ fontFamily: "'Pacifico', cursive", color: '#4a1d0d' }}>da</span>
              <span className="text-5xl md:text-6xl text-rose-700" style={{ fontFamily: "'Pacifico', cursive" }}>Beth</span>
            </div>
            <p className="mt-3 text-pink-900/80 text-sm md:text-base font-semibold tracking-wider">
              Bolos Caseiros e Especiais | Feitos com amor
            </p>
            <div className="flex flex-col items-center gap-1 mt-3">
              <span className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-1.5 rounded-full border shadow-sm ${lojaAberta ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'}`}>
                <span className={`w-2 h-2 rounded-full ${lojaAberta ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                {lojaAberta ? 'Aberto Agora (08:00 às 21:00)' : 'Fora do horário — Encomende para amanhã! 🌙'}
              </span>
            </div>
          </div>
        </header>

        {mostrarModalLogin && !isAdmin && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xs w-full p-6 shadow-2xl border border-pink-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Acesso Administrativo</h3>
              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  type="email"
                  placeholder="Seu e-mail de admin"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full text-sm px-3 py-2 border rounded-xl"
                />
                <input
                  type="password"
                  placeholder="Sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className="w-full text-sm px-3 py-2 border rounded-xl"
                />
                <button type="submit" className="w-full bg-pink-600 text-white font-bold py-2.5 rounded-xl text-sm shadow">Entrar</button>
              </form>
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto p-4 md:p-6">
          {isAdmin && (
            <section className="bg-white rounded-3xl shadow-xl p-6 border-2 border-pink-200 mb-8">
              <div className="flex gap-2 sm:gap-3 mb-6 border-b pb-4 overflow-x-auto">
                <button
                  onClick={() => setAbaAdmin('pedidos')}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2 ${abaAdmin === 'pedidos' ? 'bg-pink-600 text-white shadow-md' : 'bg-pink-50 text-pink-700 hover:bg-pink-100'}`}
                >
                  <span>📋</span> Pedidos & Financeiro ({pedidos.length})
                </button>
                <button
                  onClick={() => setAbaAdmin('clientes')}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2 ${abaAdmin === 'clientes' ? 'bg-pink-600 text-white shadow-md' : 'bg-pink-50 text-pink-700 hover:bg-pink-100'}`}
                >
                  <span>👥</span> Lista de Clientes ({listaClientes.length})
                </button>
                <button
                  onClick={() => setAbaAdmin('cardapio')}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2 ${abaAdmin === 'cardapio' ? 'bg-pink-600 text-white shadow-md' : 'bg-pink-50 text-pink-700 hover:bg-pink-100'}`}
                >
                  <span>🛠️</span> Gerenciar Cardápio
                </button>
              </div>

              {abaAdmin === 'pedidos' && (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Faturamento Recebido</span>
                      <h3 className="text-2xl font-extrabold text-emerald-700 mt-1">R$ {faturamentoTotal.toFixed(2).replace('.', ',')}</h3>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                      <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Pedidos Finalizados</span>
                      <h3 className="text-2xl font-extrabold text-amber-700 mt-1">{pedidosConcluidos.length} / {pedidos.length}</h3>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl">
                      <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">Ticket Médio</span>
                      <h3 className="text-2xl font-extrabold text-purple-700 mt-1">R$ {ticketMedio.toFixed(2).replace('.', ',')}</h3>
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-800 text-lg mb-4">Gestão de Encomendas Recebidas</h3>
                  {pedidos.length === 0 ? (
                    <p className="text-gray-500 text-xs text-center py-6">Nenhum pedido registrado ainda.</p>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {pedidos.map((ped) => (
                        <div key={ped.id} className="border border-pink-100 bg-pink-50/30 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-gray-800 text-sm">{ped.cliente}</h4>
                              <span className="text-xs text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full font-mono">📱 {ped.telefone || 'Sem WhatsApp'}</span>
                              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${ped.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800' : ped.status === 'Em Produção' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                {ped.status || 'Pendente'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">📅 <strong>Data:</strong> {ped.dataEncomenda?.split('-').reverse().join('/')} às {ped.horarioEncomenda}</p>
                            <p className="text-xs text-gray-600">🚚 <strong>Tipo:</strong> {ped.formaEntrega === 'entrega' ? `Entrega (${ped.endereco}, Nº ${ped.numero})` : 'Retirada no Local'}</p>
                            <div className="mt-2 text-xs bg-white p-2.5 rounded-xl border border-pink-100">
                              <strong>Itens:</strong> {ped.itens?.map(i => `${i.quantidade}x ${i.nome}`).join(' • ')}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0">
                            <span className="text-lg font-black text-pink-700">R$ {parseFloat(ped.total || 0).toFixed(2).replace('.', ',')}</span>
                            <div className="flex gap-1 flex-wrap">
                              <button onClick={() => handleAtualizarStatusPedido(ped.id, 'Em Produção')} className="bg-amber-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl shadow">👨‍🍳 Produção</button>
                              <button onClick={() => handleAtualizarStatusPedido(ped.id, 'Concluído')} className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl shadow">✅ Concluir</button>
                              <button onClick={() => handleAtualizarStatusPedido(ped.id, 'Cancelado')} className="bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl shadow">❌ Cancelar</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {abaAdmin === 'clientes' && (
                <div>
                  <h3 className="font-bold text-gray-800 text-lg mb-2">Lista de Contatos dos Clientes</h3>
                  <p className="text-xs text-gray-500 mb-4">Aqui estão reunidos todos os clientes que já fizeram pedidos no site.</p>
                  
                  {listaClientes.length === 0 ? (
                    <p className="text-gray-500 text-xs text-center py-6">Nenhum cliente cadastrado ainda.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                      {listaClientes.map((cli, index) => (
                        <div key={index} className="bg-pink-50/50 border border-pink-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-gray-800 text-base">{cli.nome}</h4>
                              <a 
                                href={`https://api.whatsapp.com/send?phone=55${cli.telefone.replace(/\D/g, '')}&text=Olá%20${encodeURIComponent(cli.nome)}!%20Tudo%20bem?`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition"
                              >
                                <span>💬</span> WhatsApp
                              </a>
                            </div>
                            <p className="text-xs text-gray-600 mb-1">📱 <strong>WhatsApp:</strong> {cli.telefone}</p>
                            <p className="text-xs text-gray-600 mb-1">🛍️ <strong>Total de Pedidos:</strong> {cli.totalPedidos}</p>
                            <p className="text-xs text-gray-600">💰 <strong>Valor Total Gasto:</strong> R$ {cli.valorGasto.toFixed(2).replace('.', ',')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {abaAdmin === 'cardapio' && (
                <form onSubmit={handleSalvarBolo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Nome do Bolo" value={nomeForm} onChange={(e) => setNomeForm(e.target.value)} required className="text-sm p-3 border border-pink-200 rounded-xl" />
                  <input type="number" step="0.01" placeholder="Preço (R$)" value={precoForm} onChange={(e) => setPrecoForm(e.target.value)} required className="text-sm p-3 border border-pink-200 rounded-xl" />
                  <select value={categoriaForm} onChange={(e) => setCategoriaForm(e.target.value)} className="text-sm p-3 border border-pink-200 rounded-xl md:col-span-2 bg-white">
                    {categorias.filter(c => c !== "Todas" && c !== "Mais Vendidos").map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <textarea placeholder="Descrição..." value={descricaoForm} onChange={(e) => setDescricaoForm(e.target.value)} rows={2} className="md:col-span-2 text-sm p-3 border border-pink-200 rounded-xl" />
                  <div className="md:col-span-2 flex gap-4 bg-pink-50 p-3.5 rounded-xl border border-pink-100">
                    <label className="text-xs font-semibold cursor-pointer flex items-center gap-1.5"><input type="checkbox" checked={destaqueForm} onChange={(e) => setDestaqueForm(e.target.checked)} className="w-4 h-4 rounded text-pink-600" /> Destaque ⭐</label>
                    <label className="text-xs font-semibold text-pink-700 cursor-pointer flex items-center gap-1.5"><input type="checkbox" checked={novidadeForm} onChange={(e) => setNovidadeForm(e.target.checked)} className="w-4 h-4 rounded text-pink-600" /> Novidade ✨ (15 dias)</label>
                  </div>
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-sm md:col-span-2 shadow">
                    {boloEditando ? "Atualizar Bolo" : "Cadastrar Bolo"}
                  </button>
                </form>
              )}
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className={carrinho.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
              {bolosNovidades.length > 0 && (
                <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 text-white rounded-3xl p-5 mb-6 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl animate-bounce">✨</span>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base">Novidades Fresquinhas no Cardápio!</h4>
                      <p className="text-xs text-pink-100">{bolosNovidades.map(b => b.nome).join(' • ')} — Garanta já a sua encomenda!</p>
                    </div>
                  </div>
                  <button onClick={() => { setCategoriaAtiva('Mini Bolo Vulcão'); if (cardapioRef.current) { cardapioRef.current.scrollIntoView({ behavior: 'smooth' }); }}} className="bg-white text-pink-700 hover:bg-pink-50 font-bold text-xs px-5 py-3 rounded-2xl shadow-md self-end sm:self-center transition">
                    Ver Delícias 🌋
                  </button>
                </div>
              )}

              <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
                {categorias.map((cat) => {
                  const isMiniVulcao = cat === 'Mini Bolo Vulcão';
                  const isAtiva = categoriaAtiva.toLowerCase() === cat.toLowerCase();
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategoriaAtiva(cat)}
                      className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 ${isMiniVulcao ? (isAtiva ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white ring-2 ring-amber-300 shadow-md scale-105' : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 animate-pulse') : (isAtiva ? 'bg-pink-600 text-white shadow-md' : 'bg-white text-pink-700 border border-pink-200 hover:bg-pink-100')}`}
                    >
                      {isMiniVulcao ? '🌋' : cat === 'Mais Vendidos' ? '⭐' : ''} {cat}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  placeholder="🔍 Buscar por sabor (ex: Nutella, Cenoura)..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="flex-1 px-5 py-3 rounded-2xl border border-pink-200 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div ref={cardapioRef} className="flex items-center justify-between mb-4 pt-2">
                <h2 className="text-2xl font-bold text-gray-800">
                  {categoriaAtiva === 'Todas' ? 'Nosso Cardápio' : categoriaAtiva}
                </h2>
              </div>

              {/* VITRINE DE BOLOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {bolosFiltrados.map((bolo) => (
                  <div
                    key={bolo.id}
                    className="bg-white rounded-3xl p-6 flex flex-col justify-between border border-pink-100/90 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group"
                  >
                    {bolo.novidade && (
                      <span className="absolute top-4 right-4 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold text-[10px] px-3 py-1 rounded-full shadow-md flex items-center gap-1 z-10 animate-pulse uppercase tracking-wider">
                        ✨ Novidade
                      </span>
                    )}

                    <div>
                      <div className="flex justify-between items-start gap-3 mb-2 pr-16">
                        <h3 className="font-bold text-gray-900 text-lg leading-snug">{bolo.nome}</h3>
                      </div>

                      <span className="inline-block bg-pink-50 text-pink-800 text-[11px] font-semibold px-3 py-1 rounded-full mb-3 border border-pink-100">
                        {bolo.categoria}
                      </span>

                      <p className="text-gray-600 text-xs leading-relaxed mb-6 min-h-[36px]">
                        {bolo.descricao || "Feito com ingredientes selecionados e muito carinho."}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-pink-50 flex items-center justify-between mt-auto">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Preço</span>
                        <span className="text-pink-700 font-extrabold text-lg">
                          R$ {bolo.preco.toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleEditarBolo(bolo)}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeletarBolo(bolo.id)}
                              className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm"
                            >
                              Excluir
                            </button>
                          </div>
                        ) : null}

                        <button
                          onClick={() => adicionarAoCarrinho(bolo)}
                          className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold px-5 py-2.5 rounded-2xl transition shadow-md hover:shadow-lg flex items-center gap-1.5"
                        >
                          <span>🛒</span> Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CARRINHO & DADOS DO CLIENTE COM ENDEREÇO E WHATSAPP (AGORA ROLÁVEL NO COMPUTADOR) */}
            {carrinho.length > 0 && (
              <div ref={carrinhoRef} className="bg-white rounded-3xl shadow-xl p-6 border border-pink-200 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-3 flex items-center gap-2">
                  <span>🛒</span> Seu Pedido ({totalItensCarrinho})
                </h3>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {carrinho.map((item) => (
                    <div key={item.id} className="bg-pink-50/60 p-3.5 rounded-2xl flex justify-between items-center border border-pink-100">
                      <div>
                        <h4 className="font-bold text-xs text-gray-900">{item.nome}</h4>
                        <span className="text-xs font-bold text-pink-700">R$ {(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="flex gap-1.5 items-center bg-white px-2 py-1 rounded-xl border border-pink-200 shadow-sm">
                        <button onClick={() => alterarQuantidade(item.id, -1)} className="px-2 text-pink-600 font-bold">-</button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantidade}</span>
                        <button onClick={() => alterarQuantidade(item.id, 1)} className="px-2 text-pink-600 font-bold">+</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* FORMULÁRIO DE DADOS DO CLIENTE */}
                <div className="mt-4 pt-4 border-t space-y-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Dados para Encomenda</h4>

                  <input 
                    type="text" 
                    placeholder="Seu Nome Completo *" 
                    value={nomeCliente} 
                    onChange={(e) => setNomeCliente(e.target.value)} 
                    className="w-full text-xs p-3 border border-pink-200 rounded-xl focus:outline-none focus:border-pink-500 bg-pink-50/30" 
                  />

                  <input 
                    type="text" 
                    placeholder="Seu WhatsApp / Telefone (com DDD) *" 
                    value={telefoneCliente} 
                    onChange={(e) => setTelefoneCliente(e.target.value)} 
                    className="w-full text-xs p-3 border border-pink-200 rounded-xl focus:outline-none focus:border-pink-500 font-semibold text-pink-700 bg-pink-50/30" 
                  />

                  <select
                    value={formaEntrega}
                    onChange={(e) => setFormaEntrega(e.target.value)}
                    className="w-full text-xs p-3 border border-pink-200 rounded-xl bg-pink-50/30 focus:outline-none focus:border-pink-500 font-semibold text-pink-700"
                  >
                    <option value="entrega">🚚 Entrega (Taxa R$ 7,90)</option>
                    <option value="retirada">🏠 Retirada no Local</option>
                  </select>

                  {formaEntrega === 'entrega' && (
                    <div className="space-y-2.5 bg-pink-50/70 p-3 rounded-2xl border border-pink-100">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Digite seu CEP (apenas números)"
                          value={cepCliente}
                          maxLength={8}
                          onChange={(e) => buscarCep(e.target.value)}
                          className="flex-1 text-xs p-2.5 border rounded-xl bg-white"
                        />
                        {buscandoCep && <span className="text-[10px] text-pink-600 self-center font-bold">Buscando...</span>}
                      </div>

                      <input
                        type="text"
                        placeholder="Endereço (Rua, Bairro - Cidade)"
                        value={enderecoCliente}
                        onChange={(e) => setEnderecoCliente(e.target.value)}
                        className="w-full text-xs p-2.5 border rounded-xl bg-white"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Número *"
                          value={numeroCliente}
                          onChange={(e) => setNumeroCliente(e.target.value)}
                          className="text-xs p-2.5 border rounded-xl bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Complemento"
                          value={complementoCliente}
                          onChange={(e) => setComplementoCliente(e.target.value)}
                          className="text-xs p-2.5 border rounded-xl bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-1">Data Desejada *</label>
                      <input type="date" value={dataDesejada} onChange={(e) => setDataDesejada(e.target.value)} className="w-full text-xs p-2.5 border border-pink-200 rounded-xl bg-pink-50/30" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-1">Horário *</label>
                      <input type="time" value={horarioDesejado} onChange={(e) => setHorarioDesejado(e.target.value)} className="w-full text-xs p-2.5 border border-pink-200 rounded-xl bg-pink-50/30" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Forma de Pagamento</label>
                    <select
                      value={formaPagamento}
                      onChange={(e) => setFormaPagamento(e.target.value)}
                      className="w-full text-xs p-2.5 border border-pink-200 rounded-xl bg-pink-50/30 font-semibold"
                    >
                      <option value="Pix">Pix Antecipado</option>
                      <option value="Cartao">Cartão (Na entrega / Retirada)</option>
                      <option value="Dinheiro">Dinheiro</option>
                    </select>
                  </div>

                  {formaPagamento === 'Dinheiro' && (
                    <input
                      type="text"
                      placeholder="Precisa de troco para quanto? (Ex: R$ 50)"
                      value={precisaTroco}
                      onChange={(e) => setPrecisaTroco(e.target.value)}
                      className="w-full text-xs p-2.5 border border-pink-200 rounded-xl bg-pink-50/30"
                    />
                  )}

                  <textarea
                    placeholder="Observações adicionais para o pedido..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={2}
                    className="w-full text-xs p-2.5 border border-pink-200 rounded-xl bg-pink-50/30"
                  />
                </div>

                {/* TOTAIS E BOTÃO WHATSAPP */}
                <div className="mt-4 pt-3 border-t space-y-1.5">
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
                  <div className="flex justify-between font-bold text-sm text-gray-800 pt-1 border-t">
                    <span>Total Geral:</span>
                    <span className="text-pink-700">R$ {calcularTotal().toFixed(2).replace('.', ',')}</span>
                  </div>

                  <button onClick={processarCheckout} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl text-xs mt-3 shadow-lg flex items-center justify-center gap-2 transition">
                    <span>💬</span> Enviar Pedido via WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL DO PIX ANTECIPADO */}
      {mostrarModalPix && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-pink-300 text-center relative">
            <h3 className="text-lg font-bold text-pink-700 mb-1">Pagamento via Pix</h3>
            <p className="text-xs text-gray-600 mb-4">Copie a chave Pix abaixo e realize o pagamento</p>

            <div className="bg-pink-50 p-4 rounded-2xl border border-pink-200 mb-4">
              <span className="text-[11px] font-mono break-all text-gray-700 block select-all bg-white p-2.5 rounded-xl border border-pink-100">
                {CHAVE_PIX}
              </span>
              <button
                onClick={copiarChavePix}
                className="mt-3 w-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2 rounded-xl transition shadow"
              >
                {chaveCopiada ? "✨ Chave Copiada com Sucesso!" : "Copiar Chave Pix"}
              </button>
            </div>

            <div className="mb-4 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <span className="text-xs text-amber-900 font-bold block mb-0.5">Tempo limite para pagamento:</span>
              <span className="text-xl font-extrabold text-amber-700 font-mono">{formatarTempo(tempoRestante)}</span>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={`https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${encodeURIComponent(gerarMensagemWhatsApp())}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  salvarPedidoFirestore();
                  setMostrarModalPix(false);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3.5 rounded-xl transition shadow text-center block"
              >
                Já paguei, Enviar Pedido no WhatsApp ✅
              </a>
              <button
                onClick={() => setMostrarModalPix(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold py-2 rounded-xl transition"
              >
                Cancelar / Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-amber-100/60 text-center py-6 border-t mt-12 text-xs text-pink-900/80">
        <p className="font-semibold">Caseirinhos da Beth &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
