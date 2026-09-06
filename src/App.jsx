import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider, storage } from './firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function App() {
  const [bolos, setBolos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros, Busca e Layout
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

  // Modal PIX
  const [mostrarModalPix, setMostrarModalPix] = useState(false);
  const [chaveCopiada, setChaveCopiada] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(300);

  // Autenticação & Painel Admin
  const [usuario, setUsuario] = useState(null);
  const [mostrarAdmin, setMostrarAdmin] = useState(false);
  const [boloEditando, setBoloEditando] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Formulário de Edição / Criação de Bolo
  const [formBolo, setFormBolo] = useState({
    nome: '',
    preco: '',
    categoria: 'Bolos Tradicionais',
    descricao: '',
    imagemUrl: '',
    ativo: true
  });

  const EMAIL_ADMIN = "celotube14@gmail.com";
  const NUMERO_WHATSAPP = "5511996808580"; 
  const CHAVE_PIX = "b765a02d-19ad-4eae-8c5c-da574b0c2b9b";

  // Monitora estado de Login no Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === EMAIL_ADMIN) {
        setUsuario(user);
      } else {
        setUsuario(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Timer do PIX (5 Minutos)
  useEffect(() => {
    let timer;
    if (mostrarModalPix && tempoRestante > 0) {
      timer = setInterval(() => {
        setTempoRestante((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mostrarModalPix, tempoRestante]);

  // Horário de Funcionamento
  useEffect(() => {
    const checarHorario = () => {
      const horaAtual = new Date().getHours();
      setLojaAberta(horaAtual >= 8 && horaAtual < 21);
    };
    checarHorario();
    const interval = setInterval(checarHorario, 60000);
    return () => clearInterval(interval);
  }, []);

  // Busca do Firestore em Tempo Real
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
            imagemUrl: data.imagemUrl || data.imagem || "",
            ativo: data.Ativo !== undefined ? data.Ativo : (data.ativo !== undefined ? data.ativo : true),
          });
        });
        setBolos(listaBolos);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar cardápio:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Funções de Autenticação
  const fazerLoginGoogle = async () => {
    try {
      const resultado = await signInWithPopup(auth, googleProvider);
      if (resultado.user.email !== EMAIL_ADMIN) {
        alert("Acesso negado. Este e-mail não tem permissão administrativa.");
        await signOut(auth);
      } else {
        exibirToast("Bem-vindo de volta ao Painel!");
      }
    } catch (err) {
      console.error("Erro ao fazer login:", err);
      alert("Falha na autenticação via Google.");
    }
  };

  const fazerLogout = () => {
    signOut(auth);
    setMostrarAdmin(false);
    exibirToast("Sessão encerrada.");
  };

  // Upload de Imagem para o Firebase Storage
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `bolos/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormBolo((prev) => ({ ...prev, imagemUrl: url }));
      exibirToast("Foto enviada com sucesso!");
    } catch (error) {
      console.error("Erro ao subir imagem:", error);
      alert("Erro ao fazer upload da imagem.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Salvar/Editar Bolo no Firestore
  const salvarBolo = async (e) => {
    e.preventDefault();
    if (!formBolo.nome || !formBolo.preco) {
      alert("Nome e preço são obrigatórios!");
      return;
    }

    const boloData = {
      nome: formBolo.nome,
      preco: parseFloat(formBolo.preco),
      categoria: formBolo.categoria,
      descricao: formBolo.descricao,
      imagemUrl: formBolo.imagemUrl,
      ativo: formBolo.ativo
    };

    try {
      if (boloEditando) {
        await updateDoc(doc(db, "bolos", boloEditando.id), boloData);
        exibirToast("Bolo atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "bolos"), boloData);
        exibirToast("Novo bolo cadastrado!");
      }

      limparFormularioAdmin();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar o produto.");
    }
  };

  const prepararEdicao = (bolo) => {
    setBoloEditando(bolo);
    setFormBolo({
      nome: bolo.nome,
      preco: bolo.preco,
      categoria: bolo.categoria,
      descricao: bolo.descricao,
      imagemUrl: bolo.imagemUrl || '',
      ativo: bolo.ativo
    });
  };

  const deletarBolo = async (id) => {
    if (window.confirm("Deseja realmente apagar este bolo do cardápio?")) {
      try {
        await deleteDoc(doc(db, "bolos", id));
        exibirToast("Bolo removido!");
      } catch (err) {
        console.error("Erro ao deletar:", err);
      }
    }
  };

  const limparFormularioAdmin = () => {
    setBoloEditando(null);
    setFormBolo({
      nome: '',
      preco: '',
      categoria: 'Bolos Tradicionais',
      descricao: '',
      imagemUrl: '',
      ativo: true
    });
  };

  const formatarTempo = (seg) => {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

  const calcularTotal = () => carrinho.reduce((acc, curr) => acc + curr.preco * curr.quantidade, 0);
  const totalItensCarrinho = carrinho.reduce((acc, curr) => acc + curr.quantidade, 0);

  const bolosFiltrados = bolos.filter((b) => {
    if (!b.ativo && !usuario) return false;
    const atendeCategoria = categoriaAtiva === 'Todas' || b.categoria.toLowerCase() === categoriaAtiva.toLowerCase();
    const atendeBusca = b.nome.toLowerCase().includes(busca.toLowerCase()) || b.descricao.toLowerCase().includes(busca.toLowerCase());
    return atendeCategoria && atendeBusca;
  });

  const processarCheckout = () => {
    if (!nomeCliente.trim()) return alert("Digite seu nome.");
    if (formaEntrega === 'entrega' && !enderecoCliente.trim()) return alert("Digite o endereço de entrega.");

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
    if (formaEntrega === 'entrega') mensagem += `*Endereço:* ${enderecoCliente}\n`;
    
    mensagem += `\n*Itens do Pedido:*\n`;
    carrinho.forEach((item) => {
      mensagem += `• ${item.quantidade}x ${item.nome} (R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')})\n`;
    });

    mensagem += `\n*Total:* R$ ${calcularTotal().toFixed(2).replace('.', ',')}\n`;
    mensagem += `*Pagamento:* ${formaPagamento}\n`;
    if (formaPagamento === 'Pix') mensagem += `_Pagamento realizado via PIX antecipado_\n`;
    if (formaPagamento === 'Dinheiro' && precisaTroco.trim()) mensagem += `*Troco para:* R$ ${precisaTroco}\n`;
    if (observacoes.trim()) mensagem += `\n*Observações:* ${observacoes}\n`;

    window.open(`https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${encodeURIComponent(mensagem)}`, '_blank');
    setMostrarModalPix(false);
  };

  const categorias = ["Todas", "Bolos Tradicionais", "Bolos Especiais", "Bolos com Cobertura"];

  return (
    <div className="min-h-screen bg-pink-50 font-sans pb-24 md:pb-12 relative">
      
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-xl border border-gray-700 animate-bounce">
          ✨ {toastMsg}
        </div>
      )}

      {/* Header */}
      <header className="bg-amber-50/80 text-center py-10 px-4 shadow-sm border-b border-pink-100 relative">
        <div className="max-w-md mx-auto flex flex-col items-center justify-center">
          <h1 className="text-5xl md:text-6xl font-normal leading-tight" style={{ fontFamily: "'Pacifico', cursive", color: '#4a1d0d' }}>
            Caseirinhos
          </h1>
          <span className="text-5xl md:text-6xl text-rose-700 -mt-3" style={{ fontFamily: "'Pacifico', cursive" }}>
            da Beth
          </span>
          <p className="mt-2 text-pink-900/80 text-sm font-semibold">Bolos Caseiros e Especiais | Feitos com amor</p>
          
          <span className={`inline-flex items-center gap-2 mt-3 text-xs font-bold px-4 py-1 rounded-full border ${
            lojaAberta ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${lojaAberta ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            {lojaAberta ? 'Aberto Agora (08:00 às 21:00)' : 'Fechado no momento'}
          </span>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <section className="md:col-span-2">
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Buscar por sabor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-pink-200 text-sm bg-white shadow-sm"
            />
          </div>

          <div className="mb-6 flex flex-wrap justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {categorias.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaAtiva(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    categoriaAtiva.toLowerCase() === cat.toLowerCase()
                      ? 'bg-pink-600 text-white shadow'
                      : 'bg-white text-pink-600 border border-pink-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">Nosso Cardápio</h2>
          
          {loading ? (
            <p className="text-gray-500">Carregando cardápio...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bolosFiltrados.map((bolo) => (
                <div key={bolo.id} className="bg-white rounded-xl shadow overflow-hidden border border-pink-100 flex flex-col justify-between">
                  {bolo.imagemUrl && (
                    <img src={bolo.imagemUrl} alt={bolo.nome} className="w-full h-40 object-cover" />
                  )}
                  <div className="p-4 flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-bold text-gray-800">{bolo.nome}</h3>
                      <span className="text-xs bg-pink-100 text-pink-600 font-semibold px-2 py-0.5 rounded-full">
                        {bolo.categoria}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{bolo.descricao}</p>
                  </div>

                  <div className="p-4 pt-0 flex items-center justify-between border-t border-gray-50 mt-2">
                    <span className="text-base font-bold text-pink-600">
                      R$ {bolo.preco.toFixed(2).replace('.', ',')}
                    </span>
                    
                    {usuario && mostrarAdmin ? (
                      <div className="flex gap-2">
                        <button onClick={() => prepararEdicao(bolo)} className="text-xs bg-amber-500 text-white px-2 py-1 rounded">
                          ✏️ Editar
                        </button>
                        <button onClick={() => deletarBolo(bolo.id)} className="text-xs bg-rose-600 text-white px-2 py-1 rounded">
                          🗑️
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => adicionarAoCarrinho(bolo)}
                        className="bg-pink-500 hover:bg-pink-600 text-white font-medium text-xs px-3 py-2 rounded-lg"
                      >
                        + Adicionar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Carrinho de Compras */}
        <aside className="bg-white rounded-xl shadow p-6 border border-pink-100 h-fit sticky top-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b">Seu Pedido</h2>
          
          {carrinho.length === 0 ? (
            <p className="text-gray-400 text-center py-6">Carrinho vazio.</p>
          ) : (
            <div className="space-y-4">
              <div className="max-h-48 overflow-y-auto space-y-2">
                {carrinho.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm border-b pb-2">
                    <div>
                      <p className="font-medium">{item.nome}</p>
                      <p className="text-pink-600 font-bold">R$ {(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div className="flex gap-2 items-center bg-pink-50 px-2 py-1 rounded">
                      <button onClick={() => alterarQuantidade(item.id, -1)} className="font-bold">-</button>
                      <span>{item.quantidade}</span>
                      <button onClick={() => alterarQuantidade(item.id, 1)} className="font-bold">+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="text-pink-600">R$ {calcularTotal().toFixed(2).replace('.', ',')}</span>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Seu Nome *"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                />
                <select
                  value={formaEntrega}
                  onChange={(e) => setFormaEntrega(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="entrega">Entrega</option>
                  <option value="retirada">Retirar no local</option>
                </select>

                {formaEntrega === 'entrega' && (
                  <textarea
                    placeholder="Endereço Completo *"
                    value={enderecoCliente}
                    onChange={(e) => setEnderecoCliente(e.target.value)}
                    className="w-full p-2 border rounded text-sm"
                    rows={2}
                  />
                )}

                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="Pix">Pix (Antecipado)</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Dinheiro">Dinheiro</option>
                </select>

                <button
                  onClick={processarCheckout}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl"
                >
                  {formaPagamento === 'Pix' ? 'Pagar via PIX e Finalizar' : 'Enviar no WhatsApp'}
                </button>
              </div>
            </div>
          )}
        </aside>

      </main>

      {/* Modal Admin (Exclusivo para Beth - celotube14@gmail.com) */}
      {mostrarAdmin && usuario && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="text-xl font-bold text-gray-800">
                {boloEditando ? '✏️ Editar Bolo' : '➕ Novo Bolo'}
              </h3>
              <button onClick={() => setMostrarAdmin(false)} className="text-gray-400 font-bold">✕</button>
            </div>

            <form onSubmit={salvarBolo} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Nome do Bolo</label>
                <input
                  type="text"
                  value={formBolo.nome}
                  onChange={(e) => setFormBolo({ ...formBolo, nome: e.target.value })}
                  className="w-full p-2 border rounded text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formBolo.preco}
                    onChange={(e) => setFormBolo({ ...formBolo, preco: e.target.value })}
                    className="w-full p-2 border rounded text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Categoria</label>
                  <select
                    value={formBolo.categoria}
                    onChange={(e) => setFormBolo({ ...formBolo, categoria: e.target.value })}
                    className="w-full p-2 border rounded text-sm"
                  >
                    <option value="Bolos Tradicionais">Bolos Tradicionais</option>
                    <option value="Bolos Especiais">Bolos Especiais</option>
                    <option value="Bolos com Cobertura">Bolos com Cobertura</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Descrição</label>
                <textarea
                  value={formBolo.descricao}
                  onChange={(e) => setFormBolo({ ...formBolo, descricao: e.target.value })}
                  className="w-full p-2 border rounded text-sm"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Foto do Bolo (Upload Direto)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-xs"
                />
                {uploadingImage && <p className="text-xs text-amber-600 mt-1">Enviando imagem...</p>}
                {formBolo.imagemUrl && (
                  <img src={formBolo.imagemUrl} alt="Preview" className="w-20 h-20 object-cover mt-2 rounded border" />
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button
                  type="submit"
                  disabled={uploadingImage}
                  className="flex-1 bg-pink-600 text-white font-bold py-2 rounded text-sm"
                >
                  {boloEditando ? 'Salvar Alterações' : 'Cadastrar Bolo'}
                </button>
                {boloEditando && (
                  <button
                    type="button"
                    onClick={limparFormularioAdmin}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rodapé com Acesso Administrativo */}
      <footer className="mt-12 text-center text-xs text-gray-400 border-t pt-6">
        {usuario ? (
          <div className="flex justify-center items-center gap-4">
            <span className="text-emerald-600 font-bold">🟢 Logado como {usuario.email}</span>
            <button
              onClick={() => setMostrarAdmin(true)}
              className="bg-pink-600 text-white font-bold px-3 py-1 rounded"
            >
              Painel de Gestão
            </button>
            <button onClick={fazerLogout} className="text-rose-600 underline">Sair</button>
          </div>
        ) : (
          <button onClick={fazerLoginGoogle} className="hover:underline opacity-60">
            🔒 Área Restrita (Login Admin)
          </button>
        )}
      </footer>

      {/* Modal PIX com Timer */}
      {mostrarModalPix && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center">
            <h3 className="text-xl font-bold">Pagamento via PIX</h3>
            
            <p className="text-sm my-2 text-rose-600 font-bold">
              ⏰ Tempo para pagar: {formatarTempo(tempoRestante)}
            </p>

            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(CHAVE_PIX)}`}
              alt="QR Code"
              className="mx-auto my-3 border p-2 rounded"
            />

            <button
              onClick={copiarChavePix}
              className="w-full bg-pink-100 text-pink-700 font-bold py-2 rounded mb-3 text-sm"
            >
              {chaveCopiada ? '✅ Chave Copiada!' : '📋 Copiar Chave PIX'}
            </button>

            {tempoRestante > 0 ? (
              <button
                onClick={enviarPedidoWhatsApp}
                className="w-full bg-green-500 text-white font-bold py-3 rounded-xl"
              >
                Enviar Pedido no WhatsApp
              </button>
            ) : (
              <button
                onClick={() => setTempoRestante(300)}
                className="w-full bg-pink-600 text-white font-bold py-3 rounded-xl"
              >
                🔄 Reiniciar Tempo
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
