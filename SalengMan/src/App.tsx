import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Splash from "./pages/Splash";
import SignIn from "./pages/Signin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/signin" element={<SignIn />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
