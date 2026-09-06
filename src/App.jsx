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

  // Formulário CRUD Admin
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
    if (window.confirm("Deseja excluir este produto?")) {
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
    <div style={{ fontFamily: "sans-serif", padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Botão sutil ou status do Admin */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
        {isAdmin ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "14px" }}>Admin Logado</span>
            <button onClick={handleLogout} style={{ padding: "4px 8px", cursor: "pointer" }}>Sair</button>
          </div>
        ) : (
          <button onClick={() => setShowLoginModal(true)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "12px" }}>
            🔒 Área Restrita
          </button>
        )}
      </div>

      {/* Modal / Popup de Login de sobreposição */}
      {showLoginModal && !isAdmin && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "8px", width: "300px" }}>
            <h3 style={{ marginTop: 0 }}>Login Admin</h3>
            {loginError && <p style={{ color: "red", fontSize: "12px" }}>{loginError}</p>}
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "12px" }}>E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", padding: "6px", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontSize: "12px" }}>Senha</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: "100%", padding: "6px", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" style={{ flex: 1, padding: "8px", cursor: "pointer" }}>Entrar</button>
                <button type="button" onClick={() => setShowLoginModal(false)} style={{ padding: "8px", cursor: "pointer" }}>Fechar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formulário Admin (Apenas exibe se estiver logado) */}
      {isAdmin && (
        <div style={{ background: "#f0f0f0", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
          <h3>{editingProduct ? "Editar Produto" : "Novo Produto"}</h3>
          <form onSubmit={handleSubmitProduct} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input type="text" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
            <input type="number" step="0.01" placeholder="Preço" value={price} onChange={(e) => setPrice(e.target.value)} required />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.filter(c => c !== "Todos").map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
            <textarea placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" disabled={uploading}>{uploading ? "Enviando..." : "Salvar"}</button>
              {editingProduct && <button type="button" onClick={resetForm}>Cancelar</button>}
            </div>
          </form>
        </div>
      )}

      {/* O LAYOUT CONTINUA INTACTO */}
      <div style={{ display: "flex", gap: "20px" }}>
        <div style={{ flex: 1 }}>
          {/* Categorias */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} style={{ padding: "8px 12px", cursor: "pointer", fontWeight: selectedCategory === cat ? "bold" : "normal" }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Cards de Produtos */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "15px" }}>
            {filteredProducts.map((prod) => (
              <div key={prod.id} style={{ border: "1px solid #ddd", padding: "10px", borderRadius: "8px" }}>
                <img src={prod.imageUrl} alt={prod.name} style={{ width: "100%", height: "120px", objectFit: "cover" }} />
                <h4>{prod.name}</h4>
                <p style={{ fontSize: "12px", color: "#666" }}>{prod.description}</p>
                <p style={{ fontWeight: "bold" }}>R$ {Number(prod.price).toFixed(2)}</p>
                <button onClick={() => addToCart(prod)} style={{ width: "100%", padding: "6px", cursor: "pointer" }}>Adicionar</button>
                {isAdmin && (
                  <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                    <button onClick={() => handleEditProduct(prod)} style={{ flex: 1, fontSize: "10px" }}>Editar</button>
                    <button onClick={() => handleDeleteProduct(prod.id)} style={{ flex: 1, fontSize: "10px" }}>Excluir</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Carrinho Lateral */}
        <div style={{ width: "280px", border: "1px solid #ddd", padding: "15px", borderRadius: "8px", height: "fit-content" }}>
          <h3>Carrinho</h3>
          {cart.map((item) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
              <span>{item.quantity}x {item.name}</span>
              <button onClick={() => removeFromCart(item.id)}>x</button>
            </div>
          ))}
          <p><strong>Total:</strong> R$ {cartTotal.toFixed(2)}</p>
          <button onClick={handleCheckout} style={{ width: "100%", padding: "10px", cursor: "pointer" }}>Finalizar no WhatsApp</button>
        </div>
      </div>
    </div>
  );
}
