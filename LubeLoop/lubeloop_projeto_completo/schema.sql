-- Base de Dados PostgreSQL + PostGIS para EcoOLUC SaaS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Empresas Coletoras
CREATE TABLE IF NOT EXISTS empresas_coletoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razao_social VARCHAR(255) NOT NULL,
    cnpj VARCHAR(14) UNIQUE NOT NULL,
    autorizacao_anp VARCHAR(100),
    email VARCHAR(150) NOT NULL,
    telefone VARCHAR(20),
    status_assinatura VARCHAR(20) DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Veículos Tanque
CREATE TABLE IF NOT EXISTS veiculos_tanque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas_coletoras(id) ON DELETE CASCADE,
    placa VARCHAR(7) UNIQUE NOT NULL,
    motorista_nome VARCHAR(100),
    capacidade_tanque_litros DECIMAL(10,2) NOT NULL,
    capacidade_disponivel_litros DECIMAL(10,2) NOT NULL,
    localizacao_atual GEOGRAPHY(POINT, 4326),
    status_operacional VARCHAR(20) DEFAULT 'disponivel',
    ultima_atualizacao_gps TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Geradores (Oficinas / Indústrias)
CREATE TABLE IF NOT EXISTS geradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cnpj VARCHAR(14) NOT NULL,
    nome_fantasia VARCHAR(255) NOT NULL,
    endereco VARCHAR(255) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    localizacao GEOGRAPHY(POINT, 4326),
    telefone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Solicitações de Coleta
CREATE TABLE IF NOT EXISTS solicitacoes_coleta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gerador_id UUID REFERENCES geradores(id),
    volume_estimado_litros DECIMAL(10,2) NOT NULL,
    volume_coletado_real DECIMAL(10,2),
    status VARCHAR(30) DEFAULT 'pendente',
    veiculo_id UUID REFERENCES veiculos_tanque(id),
    distancia_caminhao_km DECIMAL(8,2),
    data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_coleta_efetuada TIMESTAMP WITH TIME ZONE
);

-- 5. Função PostGIS de Busca de Caminhão Mais Próximo
CREATE OR REPLACE FUNCTION buscar_caminhao_mais_proximo(
    lat_gerador DOUBLE PRECISION,
    lng_gerador DOUBLE PRECISION,
    volume_solicitado DECIMAL
)
RETURNS TABLE (
    veiculo_id UUID,
    empresa_id UUID,
    placa VARCHAR,
    distancia_km DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id AS veiculo_id,
        v.empresa_id,
        v.placa,
        (ST_Distance(v.localizacao_atual, ST_SetSRID(ST_MakePoint(lng_gerador, lat_gerador), 4326)::geography) / 1000) AS distancia_km
    FROM 
        veiculos_tanque v
    JOIN 
        empresas_coletoras e ON e.id = v.empresa_id
    WHERE 
        v.status_operacional = 'disponivel'
        AND v.capacidade_disponivel_litros >= volume_solicitado
        AND e.status_assinatura = 'ativo'
    ORDER BY 
        v.localizacao_atual <-> ST_SetSRID(ST_MakePoint(lng_gerador, lat_gerador), 4326)::geography
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
