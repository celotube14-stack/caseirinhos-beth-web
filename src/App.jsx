import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Menu as MenuIcon, 
  X, 
  Instagram, 
  Phone, 
  Clock, 
  Plus, 
  Minus, 
  Trash2, 
  Cake, 
  Sparkles,
  Lock,
  LogOut,
  Edit,
  CheckCircle2
} from 'lucide-react';
import { db, auth } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

export default function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orderStatus, setOrderStatus] = useState(null);

  // Estados de Autenticação Admin
  const [user, setUser] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loginError, setLoginError] = useState('');

  // Estados do Formulário Admin (CRUD)
  const [editingProduct, setEditingProduct] = useState(null);
  const [nameForm, setNameForm] = useState('');
  const [priceForm, setPriceForm] = useState('');
  const [categoryForm, setCategoryForm] = useState('caseirinhos');
  const [descForm, setDescForm] = useState('');
  const [imageForm, setImageForm] = useState('');
  const [novidadeForm, setNovidadeForm] = useState(false); // Novo campo Novidade
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const defaultCategories = [
    { id: 'all', name: 'Todos' },
    { id: 'caseirinhos', name: 'Caseirinhos Tradicionais' },
    { id: 'vulcão', name: 'Mini Bolos Vulcão' },
    { id: 'recheados', name: 'Bolos Recheados' },
    { id: 'docinhos', name: 'Docinhos & Brigadeiros' },
    { id: 'bebidas', name: 'Bebidas' }
  ];

  // Monitorar Autenticação
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  // Carregar Produtos do Firestore
  useEffect(() => {
    setCategories(defaultCategories);
    
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      if (!snapshot.empty) {
        const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(prods);
      } else {
        setProducts([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar produtos:", error);
      setLoading(false);
    });

    return () => unsubProducts();
  }, []);

  // Login Admin
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      setIsLoginModalOpen(false);
      setEmail('');
      setSenha('');
      setLoginError('');
    } catch (err) {
      setLoginError('E-mail ou senha incorretos.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Salvar ou Criar Produto (Admin)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        name: nameForm,
        price: parseFloat(priceForm),
        category: categoryForm,
        description: descForm,
        image: imageForm || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=600',
        novidade: novidadeForm // Salva o estado de novidade
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
      } else {
        await addDoc(collection(db, 'products'), productData);
      }

      setIsProductModalOpen(false);
      resetProductForm();
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
      alert("Erro ao salvar produto.");
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setNameForm(product.name);
    setPriceForm(product.price);
    setCategoryForm(product.category);
    setDescForm(product.description || '');
    setImageForm(product.image || '');
    setNovidadeForm(product.novidade || false); // Carrega se é novidade
    setIsProductModalOpen(true);
  };

  const openNewModal = () => {
    resetProductForm();
    setIsProductModalOpen(true);
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setNameForm('');
    setPriceForm('');
    setCategoryForm('caseirinhos');
    setDescForm('');
    setImageForm('');
    setNovidadeForm(false);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (err) {
        console.error("Erro ao excluir:", err);
      }
    }
  };

  // Funções do Carrinho
  const addToCart = (product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id, delta) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setOrderStatus('sending');

    try {
      await addDoc(collection(db, 'orders'), {
        items: cart,
        total: cartTotal,
        createdAt: serverTimestamp(),
        status: 'pendente'
      });

      let message = `*Novo Pedido - Caseirinhos da Beth*\n\n`;
      cart.forEach(item => {
        message += `• ${item.quantity}x ${item.name} (R$ ${(item.price * item.quantity).toFixed(2)})\n`;
      });
      message += `\n*Total:* R$ ${cartTotal.toFixed(2)}`;

      const whatsappUrl = `https://wa.me/5511996808580?text=${encodeURIComponent(message)}`;

      setOrderStatus('success');
      setCart([]);
      
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
        setIsCartOpen(false);
        setOrderStatus(null);
      }, 1000);

    } catch (err) {
      console.error("Erro ao salvar pedido:", err);
      setOrderStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-amber-50/30 text-stone-800">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <div className="bg-amber-500 text-white p-2.5 rounded-2xl shadow-md">
                <Cake className="w-7 h-7" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-amber-900 leading-tight">Caseirinhos da Beth</h1>
                <p className="text-xs text-amber-600 font-medium">Bolos Caseiros & Doces Artesanais</p>
              </div>
            </div>

            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Buscar bolos, vulcões, doces..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full border border-amber-200 bg-amber-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
                <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Botão Carrinho */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative bg-amber-500 hover:bg-amber-600 text-white p-3 rounded-full shadow-md transition-all flex items-center justify-center"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Botão Admin / Painel */}
              {user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openNewModal}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Novo Bolo
                  </button>
                  <button
                    onClick={handleLogout}
                    className="bg-stone-200 hover:bg-stone-300 text-stone-700 p-2 rounded-xl text-xs font-bold flex items-center gap-1"
                    title="Sair do Admin"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="text-stone-400 hover:text-amber-600 p-2 rounded-xl transition-all"
                  title="Área Restrita (Admin)"
                >
                  <Lock className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* BANNER */}
      <section className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-white py-16 px-4 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/30 border border-amber-300/30 text-amber-100 text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" /> Feito com Amor & Carinho
        </span>
        <h2 className="text-4xl font-serif font-bold mb-4">O sabor do verdadeiro bolo caseiro</h2>
        <p className="text-amber-100 text-lg max-w-2xl mx-auto">Receitas tradicionais e ingredientes selecionados com muito carinho.</p>
      </section>

      {/* VITRINE DE PRODUTOS */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id ? 'bg-amber-600 text-white shadow-md' : 'bg-white text-stone-600 border border-stone-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-stone-500">Carregando cardápio...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-stone-500">Nenhum produto encontrado.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-amber-100 flex flex-col justify-between relative">
                
                {/* SELO DE NOVIDADE */}
                {product.novidade && (
                  <span className="absolute top-3 left-3 z-10 bg-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 animate-pulse">
                    <Sparkles className="w-3 h-3" /> Novidade ✨
                  </span>
                )}

                <div>
                  <div className="relative h-48 overflow-hidden">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-serif font-bold text-xl text-stone-800 mb-2">{product.name}</h3>
                    <p className="text-stone-600 text-sm mb-4">{product.description}</p>
                  </div>
                </div>

                <div className="px-6 pb-6 flex items-center justify-between border-t border-stone-50 pt-4">
                  <span className="text-2xl font-bold text-amber-700">R$ {product.price.toFixed(2)}</span>
                  
                  <div className="flex items-center gap-2">
                    {/* Botões do Admin na Vitrine */}
                    {user && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditModal(product)} className="bg-amber-100 text-amber-800 p-2 rounded-xl hover:bg-amber-200">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="bg-red-100 text-red-600 p-2 rounded-xl hover:bg-red-200">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <button onClick={() => addToCart(product)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-md">
                      <Plus className="w-4 h-4" /> Adicionar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL DE LOGIN ADMIN */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setIsLoginModalOpen(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600">
              <X className="w-6 h-6" />
            </button>
            <h3 className="font-serif font-bold text-xl text-amber-900 mb-4">Área Restrita (Admin)</h3>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">E-mail</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Senha</label>
                <input 
                  type="password" 
                  value={senha} 
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
              {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
              <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl shadow-md">
                Entrar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO DE PRODUTO COM CHECKBOX NOVIDADE */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsProductModalOpen(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600">
              <X className="w-6 h-6" />
            </button>
            <h3 className="font-serif font-bold text-xl text-amber-900 mb-4">
              {editingProduct ? 'Editar Bolo' : 'Cadastrar Novo Bolo'}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Nome do Bolo</label>
                <input 
                  type="text" 
                  value={nameForm} 
                  onChange={(e) => setNameForm(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Preço (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={priceForm} 
                    onChange={(e) => setPriceForm(e.target.value)}
                    required
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Categoria</label>
                  <select 
                    value={categoryForm} 
                    onChange={(e) => setCategoryForm(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 text-sm bg-white"
                  >
                    <option value="caseirinhos">Caseirinhos Tradicionais</option>
                    <option value="vulcão">Mini Bolos Vulcão</option>
                    <option value="recheados">Bolos Recheados</option>
                    <option value="docinhos">Docinhos & Brigadeiros</option>
                    <option value="bebidas">Bebidas</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Descrição</label>
                <textarea 
                  value={descForm} 
                  onChange={(e) => setDescForm(e.target.value)}
                  rows="2"
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 text-sm"
                ></textarea>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">URL da Imagem</label>
                <input 
                  type="url" 
                  value={imageForm} 
                  onChange={(e) => setImageForm(e.target.value)}
                  placeholder="https://exemplo.com/foto.jpg"
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 text-sm"
                />
              </div>

              {/* CHECKBOX DE NOVIDADE */}
              <div className="flex items-center gap-3 pt-2 pb-1 bg-pink-50 p-3 rounded-xl border border-pink-100">
                <input 
                  type="checkbox" 
                  id="novidadeCheckbox"
                  checked={novidadeForm} 
                  onChange={(e) => setNovidadeForm(e.target.checked)}
                  className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500 border-stone-300"
                />
                <label htmlFor="novidadeCheckbox" className="text-sm font-bold text-pink-900 cursor-pointer">
                  Marcar como Novidade ✨ (Exibir selo de destaque no site)
                </label>
              </div>

              <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl shadow-md">
                Salvar Produto
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CARRINHO LATERAL */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10 p-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="font-serif font-bold text-lg">Seu Carrinho</h2>
              <button onClick={() => setIsCartOpen(false)}><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-stone-400">Carrinho vazio.</div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-stone-50 p-3 rounded-xl">
                    <div>
                      <h4 className="font-semibold text-sm">{item.name}</h4>
                      <span className="text-xs text-amber-700">R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded-full bg-white border flex items-center justify-center">-</button>
                      <span className="text-sm font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded-full bg-white border flex items-center justify-center">+</button>
                      <button onClick={() => removeFromCart(item.id)} className="text-red-400 ml-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex justify-between mb-4 font-bold text-lg">
                  <span>Total:</span>
                  <span>R$ {cartTotal.toFixed(2)}</span>
                </div>
                <button onClick={handleCheckout} disabled={orderStatus === 'sending'} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold">
                  {orderStatus === 'sending' ? 'Enviando...' : 'Finalizar no WhatsApp'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}