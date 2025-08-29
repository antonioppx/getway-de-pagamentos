-- Script de seed para dados iniciais do sistema
-- Inserir configurações padrão e usuários de teste

-- Inserir configurações do sistema
INSERT INTO system_settings (key, value, description) VALUES
('app_name', 'Gateway de Pagamentos', 'Nome da aplicação'),
('app_version', '1.0.0', 'Versão da aplicação'),
('default_currency', 'BRL', 'Moeda padrão do sistema'),
('min_charge_amount', '0.01', 'Valor mínimo para cobranças'),
('max_charge_amount', '100000.00', 'Valor máximo para cobranças'),
('default_fee_percentage', '2.99', 'Taxa padrão em porcentagem'),
('default_fee_fixed', '0.30', 'Taxa fixa padrão'),
('kyc_required', 'true', 'Se KYC é obrigatório'),
('pix_enabled', 'true', 'Se PIX está habilitado'),
('boleto_enabled', 'true', 'Se boleto está habilitado'),
('credit_card_enabled', 'true', 'Se cartão de crédito está habilitado'),
('debit_card_enabled', 'true', 'Se cartão de débito está habilitado'),
('bank_transfer_enabled', 'true', 'Se transferência bancária está habilitada'),
('charge_expiration_hours', '24', 'Horas para expiração de cobranças'),
('payout_processing_hours', '2', 'Horas para processamento de payouts'),
('max_daily_limit', '10000.00', 'Limite diário padrão'),
('max_monthly_limit', '100000.00', 'Limite mensal padrão'),
('max_transaction_limit', '5000.00', 'Limite por transação padrão'),
('webhook_timeout', '30000', 'Timeout para webhooks em ms'),
('rate_limit_window_ms', '900000', 'Janela de tempo para rate limiting'),
('rate_limit_max_requests', '100', 'Máximo de requisições por janela'),
('session_ttl', '86400', 'TTL da sessão em segundos'),
('cache_ttl', '3600', 'TTL do cache em segundos');

-- Inserir configurações de taxas por método de pagamento
INSERT INTO fee_settings (payment_method, percentage, fixed, min_amount, max_amount, active) VALUES
('pix', 0.99, 0.00, 0.01, 100000.00, true),
('boleto', 2.99, 0.30, 0.01, 100000.00, true),
('credit_card', 3.99, 0.30, 0.01, 100000.00, true),
('debit_card', 2.99, 0.30, 0.01, 100000.00, true),
('bank_transfer', 1.99, 0.00, 0.01, 100000.00, true);

-- Inserir usuário administrador padrão
-- Senha: admin123 (hash bcrypt)
INSERT INTO users (
    email, 
    password, 
    first_name, 
    last_name, 
    document, 
    document_type, 
    phone, 
    role, 
    status, 
    kyc_status, 
    balance, 
    daily_limit, 
    monthly_limit, 
    transaction_limit
) VALUES (
    'admin@pagamentos.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5u.Ge', -- admin123
    'Administrador',
    'Sistema',
    '00000000000',
    'cpf',
    '(11) 99999-9999',
    'admin',
    'active',
    'approved',
    0.00,
    1000000.00,
    10000000.00,
    100000.00
);

-- Inserir usuário de teste padrão
-- Senha: user123 (hash bcrypt)
INSERT INTO users (
    email, 
    password, 
    first_name, 
    last_name, 
    document, 
    document_type, 
    phone, 
    role, 
    status, 
    kyc_status, 
    balance, 
    daily_limit, 
    monthly_limit, 
    transaction_limit
) VALUES (
    'user@pagamentos.com',
    '$2b$12$8K1p/a0dL1LXMIgoEDFrwOe6g7fKjJqKqKqKqKqKqKqKqKqKqKqKq', -- user123
    'Usuário',
    'Teste',
    '12345678901',
    'cpf',
    '(11) 88888-8888',
    'user',
    'active',
    'approved',
    1000.00,
    10000.00,
    100000.00,
    5000.00
);

-- Inserir usuário merchant de teste
-- Senha: merchant123 (hash bcrypt)
INSERT INTO users (
    email, 
    password, 
    first_name, 
    last_name, 
    document, 
    document_type, 
    phone, 
    role, 
    status, 
    kyc_status, 
    balance, 
    daily_limit, 
    monthly_limit, 
    transaction_limit
) VALUES (
    'merchant@pagamentos.com',
    '$2b$12$9L2q/b1eM2MYNJhpFE.GsPf7hLkKkKqKqKqKqKqKqKqKqKqKqKqKq', -- merchant123
    'Merchant',
    'Teste',
    '12345678000199',
    'cnpj',
    '(11) 77777-7777',
    'merchant',
    'active',
    'approved',
    5000.00,
    50000.00,
    500000.00,
    25000.00
);

-- Inserir algumas transações de exemplo
INSERT INTO transactions (
    user_id,
    type,
    status,
    amount,
    fee,
    net_amount,
    currency,
    payment_method,
    description,
    processed_at
) VALUES 
(
    (SELECT id FROM users WHERE email = 'user@pagamentos.com'),
    'charge',
    'completed',
    100.00,
    2.99,
    97.01,
    'BRL',
    'pix',
    'Pagamento de teste PIX',
    NOW() - INTERVAL '1 day'
),
(
    (SELECT id FROM users WHERE email = 'user@pagamentos.com'),
    'payout',
    'completed',
    50.00,
    1.99,
    48.01,
    'BRL',
    'bank_transfer',
    'Saque para conta bancária',
    NOW() - INTERVAL '2 days'
),
(
    (SELECT id FROM users WHERE email = 'merchant@pagamentos.com'),
    'charge',
    'completed',
    500.00,
    14.95,
    485.05,
    'BRL',
    'credit_card',
    'Venda de produto',
    NOW() - INTERVAL '3 days'
);

-- Inserir algumas cobranças de exemplo
INSERT INTO charges (
    user_id,
    amount,
    fee,
    net_amount,
    currency,
    description,
    payment_method,
    status,
    pix_key,
    pix_qr_code,
    expires_at,
    paid_at
) VALUES 
(
    (SELECT id FROM users WHERE email = 'user@pagamentos.com'),
    100.00,
    0.99,
    99.01,
    'BRL',
    'Cobrança PIX de teste',
    'pix',
    'completed',
    'user@pagamentos.com',
    '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426614174000520400005303986540510.005802BR5913Gateway Pag6008Brasilia62070503***6304E2CA',
    NOW() + INTERVAL '1 day',
    NOW() - INTERVAL '1 hour'
),
(
    (SELECT id FROM users WHERE email = 'merchant@pagamentos.com'),
    250.00,
    7.48,
    242.52,
    'BRL',
    'Cobrança boleto de teste',
    'boleto',
    'pending',
    NULL,
    NULL,
    NOW() + INTERVAL '3 days',
    NULL
);

-- Inserir alguns payouts de exemplo
INSERT INTO payouts (
    user_id,
    amount,
    fee,
    net_amount,
    currency,
    bank_code,
    bank_name,
    agency,
    account,
    account_type,
    beneficiary_name,
    beneficiary_document,
    status,
    processed_at
) VALUES 
(
    (SELECT id FROM users WHERE email = 'user@pagamentos.com'),
    50.00,
    1.99,
    48.01,
    'BRL',
    '001',
    'Banco do Brasil',
    '1234',
    '12345-6',
    'checking',
    'Usuário Teste',
    '12345678901',
    'completed',
    NOW() - INTERVAL '1 day'
);

-- Inserir algumas notificações de exemplo
INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    read
) VALUES 
(
    (SELECT id FROM users WHERE email = 'user@pagamentos.com'),
    'email',
    'Pagamento recebido',
    'Você recebeu um pagamento de R$ 100,00 via PIX',
    false
),
(
    (SELECT id FROM users WHERE email = 'user@pagamentos.com'),
    'push',
    'Payout processado',
    'Seu saque de R$ 50,00 foi processado com sucesso',
    true
);

-- Inserir alguns logs de auditoria de exemplo
INSERT INTO audit_logs (
    user_id,
    action,
    resource,
    resource_id,
    details,
    ip,
    user_agent
) VALUES 
(
    (SELECT id FROM users WHERE email = 'admin@pagamentos.com'),
    'login',
    'auth',
    NULL,
    '{"success": true}',
    '127.0.0.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
),
(
    (SELECT id FROM users WHERE email = 'user@pagamentos.com'),
    'create_charge',
    'charges',
    (SELECT id FROM charges LIMIT 1),
    '{"amount": 100.00, "payment_method": "pix"}',
    '127.0.0.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
);

-- Comentários sobre os dados inseridos
COMMENT ON TABLE system_settings IS 'Configurações do sistema inseridas automaticamente';
COMMENT ON TABLE fee_settings IS 'Taxas padrão por método de pagamento';
COMMENT ON TABLE users IS 'Usuários de teste: admin@pagamentos.com (admin123), user@pagamentos.com (user123), merchant@pagamentos.com (merchant123)';
