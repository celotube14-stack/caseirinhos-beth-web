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

  const [mostrarBotaoTopo, setMostrarBotaoTopo] = useState(false);
  const cardapioRef = useRef(null);
  const carrinhoRef = useRef(null);

  const [user, setUser] = useState(null);
  const [mostrarModalLogin, setMostrarModalLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erroLogin, setErroLogin] = useState('');

  const [abaAdmin, setAbaAdmin] = useState('pedidos');

  const [boloEditando, setBoloEditando] = useState(null);
  const [nomeForm, setNomeForm] = useState('');
  const [precoForm, setPrecoForm] = useState('');
  const [categoriaForm, setCategoriaForm] = useState('Bolos Tradicionais');
  const [descricaoForm, setDescricaoForm] = useState('');
  const [destaqueForm, setDestaqueForm] = useState(false);
  const [novidadeForm, setNovidadeForm] = useState(false);
  const [novidadeDataForm, setNovidadeDataForm] = useState(null);

  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');
  const [busca, setBusca] = useState('');
  const [lojaAberta, setLojaAberta] = useState(true);
  const [toastMsg, setToastMsg] = useState('');

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

  const [mostrarModalPix, setMostrarModalPix] = useState(false);
  const [chaveCopiada, setChaveCopiada] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(300);

  const NUMERO_WHATSAPP = "5511996808580"; 
  const CHAVE_PIX = "b765a02d-19ad-4eae-8c5c-da574b0c2b9b";
  const INSTAGRAM_URL = "https://instagram.com/beth.caseirinhos";

  useEffect(() => {
    const handleScroll = () => {
      setMostrarBotaoTopo(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const voltarAoTopo = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const timer = setTimeout(() => setLoadingInicial(false), 1800);
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
      timer = setInterval(() => setTempoRestante((prev) => prev - 1), 1000);
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
      const aberta = horaAtual >= 8 && horaAtual < 21;
      setLojaAberta(aberta);

      if (!dataDesejada) {
        const amanha = new Date();
        if (!aberta) amanha.setDate(amanha.getDate() + 1);
        setDataDesejada(amanha.toISOString().split('T')[0]);
      }
    };
    checarHorario();
    const interval = setInterval(checarHorario, 60000);
    return () => clearInterval(interval);
  }, [dataDesejada]);

  useEffect(() => {
    setLoading(true);
    const bolosRef = collection(db, "bolos");
    const unsubscribe = onSnapshot(bolosRef, (querySnapshot) => {
      const listaBolos = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let isNovidade = data.Novidade || data.novidade || false;
        const novidadeDataStr = data.novidadeData || data.NovidadeData;

        if (isNovidade && novidadeDataStr) {
          const diffTime = new Date() - new Date(novidadeDataStr);
          if (diffTime / (1000 * 60 * 60 * 24) > 15) isNovidade = false;
        }

        listaBolos.push({
          id: docSnap.id,
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
    }, (error) => {
      console.error("Erro ao escutar cardápio:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const ordersRef = collection(db, "orders");
    const unsubscribeOrders = onSnapshot(ordersRef, (snapshot) => {
      const listaPedidos = [];
      snapshot.forEach((docSnap) => {
        listaPedidos.push({ id: docSnap.id, ...docSnap.data() });
      });
      listaPedidos.sort((a, b) => new Date(b.dataCriacao || 0) - new Date(a.dataCriacao || 0));
      setPedidos(listaPedidos);
    }, (err) => {
      console.error("Erro ao carregar pedidos:", err);
    });
    return () => unsubscribeOrders();
  }, [user]);

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
      setErroLogin("E-mail ou senha incorretos.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    exibirToast("Você saiu do modo Admin.");
  };

  const handleSalvarBolo = async (e) => {
    e.preventDefault();
    if (!nomeForm || !precoForm) return alert("Preencha o nome e o preço.");

    let finalNovidadeData = novidadeDataForm;
    if (novidadeForm && !novidadeDataForm) finalNovidadeData = new Date().toISOString();
    else if (!novidadeForm) finalNovidadeData = null;

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
        await updateDoc(doc(db, "bolos", boloEditando.id), dadosBolo);
        exibirToast("Produto atualizado!");
      } else {
        await addDoc(collection(db, "bolos"), dadosBolo);
        exibirToast("Novo produto cadastrado!");
      }
      resetFormAdmin();
    } catch (error) {
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
      await updateDoc(doc(db, "orders", pedidoId), { status: novoStatus });
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
        return prev.map((item) => item.id === bolo.id ? { ...item, quantidade: item.quantidade + 1 } : item);
      }
      return [...prev, { ...bolo, quantidade: 1, comGranulado: true }];
    });
    exibirToast(`"${bolo.nome}" adicionado ao pedido!`);
    setTimeout(() => {
      if (carrinhoRef.current) carrinhoRef.current.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const alterarQuantidade = (id, delta) => {
    setCarrinho((prev) => prev.map((item) => {
      if (item.id === id) {
        const novaQtd = item.quantidade + delta;
        return novaQtd > 0 ? { ...item, quantidade: novaQtd } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const calcularSubtotal = () => carrinho.reduce((acc, curr) => acc + curr.preco * curr.quantidade, 0);
  const calcularTotal = () => calcularSubtotal() + (formaEntrega === 'entrega' ? VALOR_TAXA_ENTREGA : 0);
  const totalItensCarrinho = carrinho.reduce((acc, curr) => acc + curr.quantidade, 0);

  const bolosFiltrados = bolos.filter((b) => {
    if (!b.ativo) return false;
    let atendeCategoria = false;
    if (categoriaAtiva === 'Todas') atendeCategoria = true;
    else if (categoriaAtiva === 'Mais Vendidos') atendeCategoria = b.destaque === true;
    else atendeCategoria = b.categoria.toLowerCase() === categoriaAtiva.toLowerCase();
    const atendeBusca = b.nome.toLowerCase().includes(busca.toLowerCase()) || b.descricao.toLowerCase().includes(busca.toLowerCase());
    return atendeCategoria && atendeBusca;
  });

  const bolosNovidades = bolos.filter((b) => b.ativo && b.novidade);

  const validarFormulario = () => {
    if (!nomeCliente.trim()) { alert("Digite seu nome."); return false; }
    if (!telefoneCliente.trim()) { alert("Digite seu WhatsApp."); return false; }
    if (formaEntrega === 'entrega' && (!enderecoCliente.trim() || !numeroCliente.trim())) {
      alert("Preencha o endereço e número de entrega.");
      return false;
    }
    if (!dataDesejada || !horarioDesejado) { alert("Informe a data e horário desejados."); return false; }
    return true;
  };

  const salvarPedidoFirestore = async () => {
    const totalPedido = calcularTotal();
    try {
      await addDoc(collection(db, "orders"), {
        cliente: nomeCliente || '',
        telefone: telefoneCliente || '',
        dataEncomenda: dataDesejada || '',
        horarioEncomenda: horarioDesejado || '',
        formaEntrega: formaEntrega || 'entrega',
        cep: cepCliente || '',
        endereco: enderecoCliente || '',
        numero: numeroCliente || '',
        complemento: complementoCliente || '',
        itens: carrinho || [],
        subtotal: calcularSubtotal() || 0,
        taxaEntrega: formaEntrega === 'entrega' ? VALOR_TAXA_ENTREGA : 0,
        total: totalPedido || 0,
        formaPagamento: formaPagamento || 'Pix',
        trocoPara: precisaTroco || '',
        observacoes: observacoes || '',
        status: 'Pendente',
        dataCriacao: new Date().toISOString()
      });
    } catch (e) {
      console.error("Erro ao gravar pedido no Firestore:", e);
      alert("Erro ao salvar pedido: " + e.message);
    }
  };

  const gerarMensagemWhatsApp = () => {
    let mensagem = `*Novo Pedido (Sob Encomenda) - Caseirinhos da Beth*\n\n`;
    mensagem += `*Cliente:* ${nomeCliente}\n`;
    mensagem += `*WhatsApp:* ${telefoneCliente}\n`;
    mensagem += `*Data:* ${dataDesejada ? dataDesejada.split('-').reverse().join('/') : ''} às ${horarioDesejado}\n`;
    mensagem += `*Forma:* ${formaEntrega === 'entrega' ? 'Entrega' : 'Retirada'}\n`;
    if (formaEntrega === 'entrega') {
      mensagem += `*Endereço:* ${enderecoCliente}, Nº ${numeroCliente}\n`;
    }
    mensagem += `\n*Itens:*\n`;
    carrinho.forEach((item) => {
      mensagem += `• ${item.quantidade}x ${item.nome} (R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')})\n`;
    });
    mensagem += `\n*Total Geral:* R$ ${calcularTotal().toFixed(2).replace('.', ',')}\n`;
    mensagem += `*Pagamento:* ${formaPagamento}\n`;
    return mensagem;
  };

  const processarCheckout = async () => {
    if (!validarFormulario()) return;
    if (formaPagamento === 'Pix') {
      setTempoRestante(300);
      setMostrarModalPix(true);
    } else {
      await salvarPedidoFirestore();
      window.location.href = `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${encodeURIComponent(gerarMensagemWhatsApp())}`;
    }
  };

  const copiarChavePix = () => {
    navigator.clipboard.writeText(CHAVE_PIX);
    setChaveCopiada(true);
    setTimeout(() => setChaveCopiada(false), 3000);
  };

  const categorias = ["Todas", "Mais Vendidos", "Bolos Tradicionais", "Bolos Especiais", "Mini Bolo Vulcão"];
  const isAdmin = user && user.email === "celotube14@gmail.com";

  const pedidosConcluidos = pedidos.filter(p => p.status === 'Concluído');
  const faturamentoTotal = pedidosConcluidos.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
  const ticketMedio = pedidosConcluidos.length > 0 ? (faturamentoTotal / pedidosConcluidos.length) : 0;

  const clientesMap = {};
  pedidos.forEach(p => {
    const telKey = p.telefone || p.cliente;
    if (!clientesMap[telKey]) {
      clientesMap[telKey] = { nome: p.cliente, telefone: p.telefone || 'Não informado', totalPedidos: 0, valorGasto: 0 };
    }
    clientesMap[telKey].totalPedidos += 1;
    clientesMap[telKey].valorGasto += parseFloat(p.total || 0);
  });
  const listaClientes = Object.values(clientesMap);

  if (loadingInicial) {
    return (
      <div className="fixed inset-0 bg-pink-50 flex flex-col items-center justify-center z-50 p-4">
        <div className="w-24 h-24 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin mb-4"></div>
        <h1 className="text-3xl font-normal" style={{ fontFamily: "'Pacifico', cursive", color: '#4a1d0d' }}>Caseirinhos da Beth</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-50/50 font-sans pb-24 relative flex flex-col justify-between">
      <div>
        {toastMsg && (
          <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl">
            ✨ {toastMsg}
          </div>
        )}

        <header className="bg-amber-50/90 text-center py-6 px-4 shadow-sm border-b border-pink-100 relative">
          {isAdmin ? (
            <div className="absolute top-3 right-4 z-10 flex items-center gap-2 bg-white px-3 py-1 rounded-full border shadow-sm">
              <span className="text-xs font-bold text-pink-700">Admin Ativo</span>
              <button onClick={handleLogout} className="text-xs text-red-600 font-semibold">Sair</button>
            </div>
          ) : (
            <button onClick={() => setMostrarModalLogin(true)} className="absolute top-3 right-4 text-xs font-semibold text-gray-500 hover:text-pink-600">
              🔒 Área Restrita
            </button>
          )}

          <div className="max-w-md mx-auto flex flex-col items-center">
            <img src="/logo.png" alt="Caseirinhos da Beth" className="w-80 md:w-[420px] object-contain mb-1" onError={(e) => { e.target.style.display = 'none'; }} />
            <p className="text-pink-900/80 text-sm font-semibold tracking-wider">Bolos Caseiros e Especiais | Feitos com amor</p>
            <span className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-1.5 rounded-full border mt-3 ${lojaAberta ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'}`}>
              <span className={`w-2 h-2 rounded-full ${lojaAberta ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              {lojaAberta ? 'Aberto Agora (08:00 às 21:00)' : 'Fora do horário'}
            </span>
          </div>
        </header>

        {mostrarModalLogin && !isAdmin && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xs w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Acesso Administrativo</h3>
              <form onSubmit={handleLogin} className="space-y-3">
                <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full text-sm px-3 py-2 border rounded-xl" />
                <input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required className="w-full text-sm px-3 py-2 border rounded-xl" />
                {erroLogin && <p className="text-red-500 text-xs">{erroLogin}</p>}
                <button type="submit" className="w-full bg-pink-600 text-white font-bold py-2.5 rounded-xl text-sm">Entrar</button>
                <button type="button" onClick={() => setMostrarModalLogin(false)} className="w-full bg-gray-100 text-gray-600 text-xs py-2 rounded-xl mt-1">Cancelar</button>
              </form>
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto p-4 md:p-6">
          {isAdmin && (
            <section className="bg-white rounded-3xl shadow-xl p-6 border-2 border-pink-200 mb-8">
              <div className="flex gap-2 mb-6 border-b pb-4 overflow-x-auto">
                <button onClick={() => setAbaAdmin('pedidos')} className={`px-4 py-2.5 rounded-xl font-bold text-xs ${abaAdmin === 'pedidos' ? 'bg-pink-600 text-white' : 'bg-pink-50 text-pink-700'}`}>Pedidos & Financeiro ({pedidos.length})</button>
                <button onClick={() => setAbaAdmin('clientes')} className={`px-4 py-2.5 rounded-xl font-bold text-xs ${abaAdmin === 'clientes' ? 'bg-pink-600 text-white' : 'bg-pink-50 text-pink-700'}`}>Clientes ({listaClientes.length})</button>
                <button onClick={() => setAbaAdmin('cardapio')} className={`px-4 py-2.5 rounded-xl font-bold text-xs ${abaAdmin === 'cardapio' ? 'bg-pink-600 text-white' : 'bg-pink-50 text-pink-700'}`}>Cardápio</button>
              </div>

              {abaAdmin === 'pedidos' && (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-emerald-50 border p-4 rounded-2xl">
                      <span className="text-xs font-bold text-emerald-800">FATURAMENTO RECEBIDO</span>
                      <h3 className="text-2xl font-extrabold text-emerald-700 mt-1">R$ {faturamentoTotal.toFixed(2).replace('.', ',')}</h3>
                    </div>
                    <div className="bg-amber-50 border p-4 rounded-2xl">
                      <span className="text-xs font-bold text-amber-800">PEDIDOS FINALIZADOS</span>
                      <h3 className="text-2xl font-extrabold text-amber-700 mt-1">{pedidosConcluidos.length} / {pedidos.length}</h3>
                    </div>
                    <div className="bg-purple-50 border p-4 rounded-2xl">
                      <span className="text-xs font-bold text-purple-800">TICKET MÉDIO</span>
                      <h3 className="text-2xl font-extrabold text-purple-700 mt-1">R$ {ticketMedio.toFixed(2).replace('.', ',')}</h3>
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-800 text-lg mb-4">Gestão de Encomendas Recebidas</h3>
                  {pedidos.length === 0 ? (
                    <p className="text-gray-500 text-xs text-center py-6">Nenhum pedido registrado ainda.</p>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {pedidos.map((ped) => (
                        <div key={ped.id} className="border bg-pink-50/30 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-gray-800 text-sm">{ped.cliente}</h4>
                              <span className="text-xs text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full">📱 {ped.telefone}</span>
                              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${ped.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{ped.status}</span>
                            </div>
                            <p className="text-xs text-gray-600">📅 {ped.dataEncomenda} às {ped.horarioEncomenda}</p>
                            <div className="mt-2 text-xs bg-white p-2 rounded-xl border">
                              <strong>Itens:</strong> {ped.itens?.map(i => `${i.quantidade}x ${i.nome}`).join(' • ')}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-lg font-black text-pink-700">R$ {parseFloat(ped.total || 0).toFixed(2).replace('.', ',')}</span>
                            <div className="flex gap-1">
                              <button onClick={() => handleAtualizarStatusPedido(ped.id, 'Em Produção')} className="bg-amber-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl">Produção</button>
                              <button onClick={() => handleAtualizarStatusPedido(ped.id, 'Concluído')} className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl">Concluir</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {abaAdmin === 'clientes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {listaClientes.map((cli, idx) => (
                    <div key={idx} className="bg-pink-50 border p-4 rounded-2xl">
                      <h4 className="font-bold text-gray-800">{cli.nome}</h4>
                      <p className="text-xs text-gray-600">WhatsApp: {cli.telefone}</p>
                      <p className="text-xs text-gray-600">Pedidos: {cli.totalPedidos} | Gasto: R$ {cli.valorGasto.toFixed(2).replace('.', ',')}</p>
                    </div>
                  ))}
                </div>
              )}

              {abaAdmin === 'cardapio' && (
                <form onSubmit={handleSalvarBolo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Nome do Bolo" value={nomeForm} onChange={(e) => setNomeForm(e.target.value)} required className="text-sm p-3 border rounded-xl" />
                  <input type="number" step="0.01" placeholder="Preço (R$)" value={precoForm} onChange={(e) => setPrecoForm(e.target.value)} required className="text-sm p-3 border rounded-xl" />
                  <select value={categoriaForm} onChange={(e) => setCategoriaForm(e.target.value)} className="text-sm p-3 border rounded-xl md:col-span-2 bg-white">
                    {categorias.filter(c => c !== "Todas" && c !== "Mais Vendidos").map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <textarea placeholder="Descrição..." value={descricaoForm} onChange={(e) => setDescricaoForm(e.target.value)} rows={2} className="md:col-span-2 text-sm p-3 border rounded-xl" />
                  <button type="submit" className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl text-sm md:col-span-2">Salvar Produto</button>
                </form>
              )}
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={carrinho.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
              <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
                {categorias.map((cat) => (
                  <button key={cat} onClick={() => setCategoriaAtiva(cat)} className={`px-5 py-2.5 rounded-2xl text-xs font-bold ${categoriaAtiva === cat ? 'bg-pink-600 text-white' : 'bg-white text-pink-700 border'}`}>
                    {cat}
                  </button>
                ))}
              </div>

              <input type="text" placeholder="🔍 Buscar por sabor..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full px-5 py-3 rounded-2xl border mb-6 text-sm bg-white" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {bolosFiltrados.map((bolo) => (
                  <div key={bolo.id} className="bg-white rounded-3xl p-6 flex flex-col justify-between border shadow-sm relative">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg mb-1">{bolo.nome}</h3>
                      <span className="inline-block bg-pink-50 text-pink-800 text-[11px] font-semibold px-3 py-1 rounded-full mb-3">{bolo.categoria}</span>
                      <p className="text-gray-600 text-xs mb-6">{bolo.descricao}</p>
                    </div>
                    <div className="pt-4 border-t flex items-center justify-between">
                      <span className="text-pink-700 font-extrabold text-lg">R$ {bolo.preco.toFixed(2).replace('.', ',')}</span>
                      <button onClick={() => adicionarAoCarrinho(bolo)} className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold px-5 py-2.5 rounded-2xl">
                        🛒 Adicionar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {carrinho.length > 0 && (
              <div ref={carrinhoRef} className="bg-white rounded-3xl shadow-xl p-6 border sticky top-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-3">Seu Pedido ({totalItensCarrinho})</h3>
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {carrinho.map((item) => (
                    <div key={item.id} className="bg-pink-50 p-3 rounded-2xl flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-xs text-gray-900">{item.nome}</h4>
                        <span className="text-xs font-bold text-pink-700">R$ {(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="flex gap-1.5 items-center bg-white px-2 py-1 rounded-xl border">
                        <button onClick={() => alterarQuantidade(item.id, -1)} className="px-2 text-pink-600 font-bold">-</button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantidade}</span>
                        <button onClick={() => alterarQuantidade(item.id, 1)} className="px-2 text-pink-600 font-bold">+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t space-y-3">
                  <input type="text" placeholder="Seu Nome Completo *" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} className="w-full text-xs p-3 border rounded-xl" />
                  <input type="text" placeholder="Seu WhatsApp *" value={telefoneCliente} onChange={(e) => setTelefoneCliente(e.target.value)} className="w-full text-xs p-3 border rounded-xl" />
                  
                  <select value={formaEntrega} onChange={(e) => setFormaEntrega(e.target.value)} className="w-full text-xs p-3 border rounded-xl">
                    <option value="entrega">🚚 Entrega (Taxa R$ 7,90)</option>
                    <option value="retirada">🏠 Retirada no Local</option>
                  </select>

                  {formaEntrega === 'entrega' && (
                    <div className="space-y-2 bg-pink-50 p-3 rounded-xl border">
                      <input type="text" placeholder="CEP" value={cepCliente} maxLength={8} onChange={(e) => buscarCep(e.target.value)} className="w-full text-xs p-2 border rounded-lg bg-white" />
                      <input type="text" placeholder="Endereço" value={enderecoCliente} onChange={(e) => setEnderecoCliente(e.target.value)} className="w-full text-xs p-2 border rounded-lg bg-white" />
                      <input type="text" placeholder="Número *" value={numeroCliente} onChange={(e) => setNumeroCliente(e.target.value)} className="w-full text-xs p-2 border rounded-lg bg-white" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={dataDesejada} onChange={(e) => setDataDesejada(e.target.value)} className="text-xs p-2 border rounded-xl" />
                    <input type="time" value={horarioDesejado} onChange={(e) => setHorarioDesejado(e.target.value)} className="text-xs p-2 border rounded-xl" />
                  </div>

                  <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className="w-full text-xs p-2 border rounded-xl font-semibold">
                    <option value="Pix">Pix Antecipado</option>
                    <option value="Cartao">Cartão</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>

                <div className="mt-4 pt-3 border-t space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Subtotal:</span>
                    <span>R$ {calcularSubtotal().toFixed(2).replace('.', ',')}</span>
                  </div>
                  {formaEntrega === 'entrega' && (
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Taxa:</span>
                      <span>R$ {VALOR_TAXA_ENTREGA.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm pt-1 border-t">
                    <span>Total:</span>
                    <span className="text-pink-700">R$ {calcularTotal().toFixed(2).replace('.', ',')}</span>
                  </div>

                  <button onClick={processarCheckout} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl text-xs mt-3 shadow-lg flex items-center justify-center gap-2">
                    <span>💬</span> Enviar Pedido via WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {mostrarModalPix && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center border-2 border-pink-300">
            <h3 className="text-lg font-bold text-pink-700 mb-1">Pagamento via Pix</h3>
            <p className="text-xs text-gray-600 mb-4">Copie a chave Pix abaixo</p>
            <div className="bg-pink-50 p-4 rounded-2xl border mb-4">
              <span className="text-[11px] font-mono break-all text-gray-700 bg-white p-2.5 rounded-xl border block">{CHAVE_PIX}</span>
              <button onClick={copiarChavePix} className="mt-3 w-full bg-pink-600 text-white text-xs font-bold py-2 rounded-xl">
                {chaveCopiada ? "✨ Chave Copiada!" : "Copiar Chave Pix"}
              </button>
            </div>
            <button onClick={async () => {
              await salvarPedidoFirestore();
              setMostrarModalPix(false);
              window.location.href = `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${encodeURIComponent(gerarMensagemWhatsApp())}`;
            }} className="w-full bg-emerald-600 text-white text-xs font-bold py-3 rounded-xl mb-2">
              Já paguei, Enviar no WhatsApp ✅
            </button>
            <button onClick={() => setMostrarModalPix(false)} className="w-full bg-gray-100 text-gray-600 text-xs py-2 rounded-xl">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
