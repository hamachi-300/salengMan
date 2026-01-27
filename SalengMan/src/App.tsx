import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Splash from "./pages/Splash";
import SignIn from "./pages/Signin";
import SignupGoogle from "./pages/SignupGoogle";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup-google" element={<SignupGoogle />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
