import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import Home from './components/Home.jsx';
import ZeroTwoSixTask from './components/ZeroTwoSixTask.jsx';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
        <Route path='/' element={<App/>} />
        <Route path='/home' element={<Home/>} />
        <Route path='/0206task' element={<ZeroTwoSixTask/>} />
    </Routes>
  </BrowserRouter>
)