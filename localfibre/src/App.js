import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Helmet } from 'react-helmet'

import './App.css';
import Home from './pages/home/home';

function App() {
  return (
    <div className="App">
      <Helmet>
        <title>Local Fibre</title>
        <meta name="Fibre Artist" 
            content="Fibre Artist based in West Auckland, New Zealand.
                  Using recycled fabrics to make clothing and art " />
      </Helmet>

      <Home />
     
    </div>
  )}

export default App;
