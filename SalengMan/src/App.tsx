import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Splash from "./pages/Splash";
import SignIn from "./pages/Signin";
import ItemUpload from "./pages/SellSecondHand/ItemUpload";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/ItemUpload" element={<ItemUpload />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
