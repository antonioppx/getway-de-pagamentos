import express from 'express';

const app = express();

app.use(express.json());

// Health check simples
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Gateway funcionando!' });
});

// Rota principal simples
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Gateway de Pagamentos</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; }
        .btn { background: #1a73e8; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏦 Gateway de Pagamentos</h1>
        <p>Demo funcionando!</p>
        <button class="btn" onclick="testAPI()">Testar API</button>
        <div id="result"></div>
    </div>
    
    <script>
        async function testAPI() {
            try {
                const response = await fetch('/api/health');
                const data = await response.json();
                document.getElementById('result').innerHTML = '<p>✅ API funcionando: ' + data.message + '</p>';
            } catch (error) {
                document.getElementById('result').innerHTML = '<p>❌ Erro: ' + error.message + '</p>';
            }
        }
    </script>
</body>
</html>
  `);
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ error: 'Erro interno' });
});

export default app;
