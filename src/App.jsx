import React, { useState, useEffect } from "react";
import { db, auth, storage } from "./firebase";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from "firebase/firestore";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "firebase/storage";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  // Autenticação Admin
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState("celotube14@gmail.com");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // CRUD Admin
  const [editingProduct, setEditingProduct] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Bolos Tradicionais");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const categories = ["Todos", "Bolos Tradicionais", "Bolos com Cobertura", "Bolos Especiais", "Salgados"];

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const unsubscribeSnapshot = onSnapshot(collection(db, "products"), (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(items);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot();
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowLoginModal(false);
      setPassword("");
    } catch (error) {
      console.error(error);
      setLoginError("E-mail ou senha incorretos.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      })
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    let message = "*Novo Pedido - Caseirinhos da Beth*\n\n";
    cart.forEach((item) => {
      message += `• ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
    });
    message += `\n*Total:* R$ ${cartTotal.toFixed(2)}`;
    
    const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleImageUpload = async (file) => {
    if (!file) return imageUrl;
    setUploading(true);
    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setUploading(false);
      return url;
    } catch (error) {
      console.error("Erro upload:", error);
      setUploading(false);
      return imageUrl;
    }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!name || !price) return;

    let finalImageUrl = imageUrl;
    if (imageFile) {
      finalImageUrl = await handleImageUpload(imageFile);
    }

    const productData = {
      name,
      price: parseFloat(price),
      category,
      description,
      imageUrl: finalImageUrl || "https://via.placeholder.com/150",
    };

    try {
      if (editingProduct) {
        await updateDoc(doc(db, "products", editingProduct.id), productData);
      } else {
        await addDoc(collection(db, "products"), productData);
      }
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditProduct = (prod) => {
    setEditingProduct(prod);
    setName(prod.name);
    setPrice(prod.price);
    setCategory(prod.category || "Bolos Tradicionais");
    setDescription(prod.description || "");
    setImageUrl(prod.imageUrl || "");
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Deseja realmente excluir este produto?")) {
      await deleteDoc(doc(db, "products", id));
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setName("");
    setPrice("");
    setCategory("Bolos Tradicionais");
    setDescription("");
    setImageFile(null);
    setImageUrl("");
  };

  const filteredProducts = selectedCategory === "Todos" 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const isAdmin = user && user.email === "celotube14@gmail.com";

  return (
    <div className="min-h-screen bg-amber-50/30">
      {/* Header Bonito */}
      <header className="bg-white border-b border-amber-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍰</span>
            <div>
              <h1 className="text-xl font-bold text-amber-900">Caseirinhos da Beth</h1>
              <p className="text-xs text-amber-600">Bolos e Doces Caseiros</p>
            </div>
          </div>

          <div>
            {isAdmin ? (
              <div className="flex items-center gap-3">
                <span className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-medium">
                  Painel Admin ({user.email})
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
              >
                <span>🔒</span> Área Restrita
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Modal de Login */}
      {showLoginModal && !isAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-amber-900">Acesso Restrito</h3>
              <button 
                onClick={() => setShowLoginModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            
            {loginError && (
              <p className="text-xs bg-red-50 text-red-600 p-2.5 rounded-lg mb-3 border border-red-100">
                {loginError}
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
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Senha</label>
                <input
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-lg text-sm transition"
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold px-4 py-2 rounded-lg text-sm transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Formulário Admin se logado */}
        {isAdmin && (
          <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm mb-8">
            <h2 className="text-lg font-bold text-amber-900 mb-4">
              {editingProduct ? "Editar Produto" : "Cadastrar Novo Produto"}
            </h2>
            <form onSubmit={handleSubmitProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nome do Produto"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-sm p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Preço (R$)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="text-sm p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="text-sm p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
              >
                {categories.filter(c => c !== "Todos").map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="text-sm p-2 border border-gray-200 rounded-lg"
              />
              <textarea
                placeholder="Descrição do produto..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="md:col-span-2 text-sm p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none h-20"
              />
              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition"
                >
                  {uploading ? "Salvando..." : editingProduct ? "Atualizar Produto" : "Salvar Produto"}
                </button>
                {editingProduct && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-2.5 rounded-lg text-sm transition"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Categorias */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-amber-50 border border-gray-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid de Produtos + Carrinho */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-2xl overflow-hidden border border-amber-100 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 overflow-hidden bg-gray-100 relative">
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-800 text-base mb-1">{prod.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{prod.description}</p>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-amber-700">
                      R$ {Number(prod.price).toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={() => addToCart(prod)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-xl text-sm transition"
                  >
                    + Adicionar
                  </button>

                  {isAdmin && (
                    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleEditProduct(prod)}
                        className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold py-1 rounded text-xs transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 font-semibold py-1 rounded text-xs transition"
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Carrinho Lateral */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-amber-100 rounded-2xl p-5 shadow-sm sticky top-24">
              <h2 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
                <span>🛒</span> Seu Carrinho
              </h2>

              {cart.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  Seu carrinho está vazio.
                </p>
              ) : (
                <div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1 mb-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs pb-2 border-b border-gray-50">
                        <div>
                          <p className="font-semibold text-gray-800">{item.name}</p>
                          <p className="text-amber-700 font-bold">R$ {(item.price * item.quantity).toFixed(2)}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold"
                          >
                            -
                          </button>
                          <span className="font-bold text-gray-700">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-400 hover:text-red-600 font-bold ml-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-100 pt-3 mb-4 flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500">Total</span>
                    <span className="text-lg font-bold text-amber-700">R$ {cartTotal.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm transition shadow-sm"
                  >
                    Finalizar no WhatsApp
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
