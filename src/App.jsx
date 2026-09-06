import React, { useState, useEffect } from "react";
import { 
  db, 
  auth, 
  storage 
} from "./firebase";
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
  // Estado de Produtos e Carrinho
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  // Estado de Autenticação Admin
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState("celotube14@gmail.com");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Estado de Gerenciamento do CRUD (Formulário Admin)
  const [editingProduct, setEditingProduct] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Bolos Tradicionais");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Categorias
  const categories = ["Todos", "Bolos Tradicionais", "Bolos com Cobertura", "Bolos Especiais", "Salgados"];

  // Observa Autenticação e Produtos do Firestore
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

  // Login por E-mail e Senha
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowLoginModal(false);
      setPassword("");
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      setLoginError("E-mail ou senha incorretos.");
    }
  };

  // Logout
  const handleLogout = async () => {
    await signOut(auth);
  };

  // Funções do Carrinho
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

  // Enviar Pedido via WhatsApp
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

  // Funções do Painel Admin (CRUD + Upload de Imagem)
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
      console.error("Erro no upload da imagem:", error);
      setUploading(false);
      return imageUrl;
    }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!name || !price) {
      alert("Preencha o nome e o preço do produto.");
      return;
    }

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
        alert("Produto atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "products"), productData);
        alert("Produto cadastrado com sucesso!");
      }
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      alert("Erro ao salvar produto.");
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
      try {
        await deleteDoc(doc(db, "products", id));
      } catch (error) {
        console.error("Erro ao deletar produto:", error);
      }
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
    <div style={{ fontFamily: "Arial, sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "20px" }}>
      {/* Cabeçalho */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", padding: "15px 30px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
        <h1 style={{ color: "#d97706", margin: 0 }}>🍰 Caseirinhos da Beth</h1>
        <div>
          {user ? (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span style={{ fontSize: "14px", color: "#4b5563" }}>Admin: {user.email}</span>
              <button onClick={handleLogout} style={{ padding: "8px 12px", backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>Sair</button>
            </div>
          ) : (
            <button onClick={() => setShowLoginModal(true)} style={{ padding: "8px 12px", backgroundColor: "#d97706", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
              🔒 Área Restrita
            </button>
          )}
        </div>
      </header>

      {/* Modal de Login */}
      {showLoginModal && !user && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "8px", width: "320px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0, color: "#d97706" }}>Login Administrativo</h3>
            {loginError && <p style={{ color: "red", fontSize: "14px" }}>{loginError}</p>}
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>E-mail:</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  style={{ width: "100%", padding: "8px", boxSizing: "border-box" }} 
                />
              </div>
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>Senha:</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Sua senha do Firebase"
                  required 
                  style={{ width: "100%", padding: "8px", boxSizing: "border-box" }} 
                />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" style={{ flex: 1, padding: "10px", backgroundColor: "#d97706", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>Entrar</button>
                <button type="button" onClick={() => setShowLoginModal(false)} style={{ padding: "10px", backgroundColor: "#9ca3af", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Painel Administrativo (Exibido apenas para Admin Logado) */}
      {isAdmin && (
        <section style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", marginBottom: "30px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <h2 style={{ color: "#374151", marginTop: 0 }}>{editingProduct ? "Editar Produto" : "Cadastrar Novo Produto"}</h2>
          <form onSubmit={handleSubmitProduct} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <input type="text" placeholder="Nome do Produto" value={name} onChange={(e) => setName(e.target.value)} required style={{ padding: "10px" }} />
            <input type="number" step="0.01" placeholder="Preço (R$)" value={price} onChange={(e) => setPrice(e.target.value)} required style={{ padding: "10px" }} />
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: "10px" }}>
              {categories.filter(c => c !== "Todos").map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ padding: "10px" }} />
            <textarea placeholder="Descrição do produto" value={description} onChange={(e) => setDescription(e.target.value)} style={{ gridColumn: "span 2", padding: "10px", height: "60px" }} />
            <div style={{ gridColumn: "span 2", display: "flex", gap: "10px" }}>
              <button type="submit" disabled={uploading} style={{ padding: "10px 20px", backgroundColor: "#10b981", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
                {uploading ? "Salvando..." : editingProduct ? "Atualizar Produto" : "Salvar Produto"}
              </button>
              {editingProduct && (
                <button type="button" onClick={resetForm} style={{ padding: "10px 20px", backgroundColor: "#6b7280", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
                  Cancelar Edição
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {/* Filtros de Categoria */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", overflowX: "auto" }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: "none",
              backgroundColor: selectedCategory === cat ? "#d97706" : "#e5e7eb",
              color: selectedCategory === cat ? "#fff" : "#374151",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid Principal: Produtos e Carrinho */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px" }}>
        {/* Lista de Produtos */}
        <main style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
          {filteredProducts.map((prod) => (
            <div key={prod.id} style={{ backgroundColor: "#fff", borderRadius: "8px", padding: "15px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <img src={prod.imageUrl} alt={prod.name} style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "6px" }} />
                <h3 style={{ margin: "10px 0 5px 0", fontSize: "16px" }}>{prod.name}</h3>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 10px 0" }}>{prod.description}</p>
              </div>
              <div>
                <span style={{ fontSize: "18px", fontWeight: "bold", color: "#d97706", display: "block", marginBottom: "10px" }}>
                  R$ {Number(prod.price).toFixed(2)}
                </span>
                <button onClick={() => addToCart(prod)} style={{ width: "100%", padding: "8px", backgroundColor: "#f59e0b", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                  + Adicionar
                </button>
                {isAdmin && (
                  <div style={{ display: "flex", gap: "5px", marginTop: "8px" }}>
                    <button onClick={() => handleEditProduct(prod)} style={{ flex: 1, padding: "5px", backgroundColor: "#3b82f6", color: "#fff", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "12px" }}>Editar</button>
                    <button onClick={() => handleDeleteProduct(prod.id)} style={{ flex: 1, padding: "5px", backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "12px" }}>Excluir</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </main>

        {/* Carrinho de Compras */}
        <aside style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", height: "fit-content" }}>
          <h2 style={{ marginTop: 0, fontSize: "18px", color: "#374151" }}>🛒 Seu Carrinho</h2>
          {cart.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: "14px" }}>Seu carrinho está vazio.</p>
          ) : (
            <div>
              {cart.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "1fr solid #f3f4f6", paddingBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "bold" }}>{item.name}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>R$ {(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <button onClick={() => updateQuantity(item.id, -1)} style={{ padding: "2px 6px" }}>-</button>
                    <span style={{ fontSize: "14px" }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} style={{ padding: "2px 6px" }}>+</button>
                    <button onClick={() => removeFromCart(item.id)} style={{ padding: "2px 6px", color: "red", border: "none", background: "none", cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              ))}
              <hr style={{ margin: "15px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "bold", marginBottom: "15px" }}>
                <span>Total:</span>
                <span style={{ color: "#d97706" }}>R$ {cartTotal.toFixed(2)}</span>
              </div>
              <button onClick={handleCheckout} style={{ width: "100%", padding: "12px", backgroundColor: "#22c55e", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}>
                Enviar Pedido pelo WhatsApp
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
