-- ============================================================
-- 餐厨废油回收监管系统 - 数据库初始化脚本
-- ============================================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- ============================================================
-- 枚举类型定义
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'store', 'driver', 'inspector');
CREATE TYPE appointment_status AS ENUM ('pending', 'accepted', 'completed', 'cancelled');
CREATE TYPE weighing_status AS ENUM ('draft', 'signed', 'verified', 'exception');
CREATE TYPE disposal_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE exception_type AS ENUM ('weight_diff', 'route_deviation', 'no_signature', 'timeout');
CREATE TYPE exception_status AS ENUM ('open', 'processing', 'resolved', 'closed');
CREATE TYPE route_status AS ENUM ('planning', 'in_transit', 'completed', 'deviated');
CREATE TYPE settlement_status AS ENUM ('pending', 'frozen', 'paid', 'cancelled');
CREATE TYPE vehicle_status AS ENUM ('idle', 'in_service', 'maintenance', 'disabled');

-- ============================================================
-- 系统用户表
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    real_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    role user_role NOT NULL DEFAULT 'store',
    is_active BOOLEAN DEFAULT TRUE,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 餐饮门店表
-- ============================================================

CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    store_code VARCHAR(50) UNIQUE NOT NULL,
    store_name VARCHAR(200) NOT NULL,
    address VARCHAR(500) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    business_license VARCHAR(100),
    daily_output_kg DECIMAL(10, 2) DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 回收车辆表
-- ============================================================

CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    capacity_kg DECIMAL(10, 2) NOT NULL,
    driver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status vehicle_status DEFAULT 'idle',
    device_id VARCHAR(100),
    current_longitude DECIMAL(10, 7),
    current_latitude DECIMAL(10, 7),
    last_update_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 处置厂表
-- ============================================================

CREATE TABLE IF NOT EXISTS disposal_factories (
    id SERIAL PRIMARY KEY,
    factory_code VARCHAR(50) UNIQUE NOT NULL,
    factory_name VARCHAR(200) NOT NULL,
    address VARCHAR(500) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    qualification_cert VARCHAR(100),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 回收预约表
-- ============================================================

CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    appointment_no VARCHAR(50) UNIQUE NOT NULL,
    store_id INTEGER REFERENCES stores(id) NOT NULL,
    vehicle_id INTEGER REFERENCES vehicles(id),
    driver_id INTEGER REFERENCES users(id),
    expected_weight_kg DECIMAL(10, 2) NOT NULL,
    oil_type VARCHAR(50) DEFAULT '餐厨废油',
    appointment_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_arrive_time TIMESTAMP WITH TIME ZONE,
    actual_complete_time TIMESTAMP WITH TIME ZONE,
    status appointment_status DEFAULT 'pending',
    remark TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 称重记录表
-- ============================================================

CREATE TABLE IF NOT EXISTS weighings (
    id SERIAL PRIMARY KEY,
    weighing_no VARCHAR(50) UNIQUE NOT NULL,
    appointment_id INTEGER REFERENCES appointments(id) NOT NULL,
    store_id INTEGER REFERENCES stores(id) NOT NULL,
    vehicle_id INTEGER REFERENCES vehicles(id) NOT NULL,
    driver_id INTEGER REFERENCES users(id) NOT NULL,
    declared_weight_kg DECIMAL(10, 2) NOT NULL,
    actual_weight_kg DECIMAL(10, 2) NOT NULL,
    tare_weight_kg DECIMAL(10, 2) DEFAULT 0,
    net_weight_kg DECIMAL(10, 2) NOT NULL,
    weight_diff_percent DECIMAL(5, 2),
    photo_urls TEXT[],
    status weighing_status DEFAULT 'draft',
    signature_data TEXT,
    signed_at TIMESTAMP WITH TIME ZONE,
    signed_by INTEGER REFERENCES users(id),
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 运输路线表
-- ============================================================

CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    route_no VARCHAR(50) UNIQUE NOT NULL,
    weighing_id INTEGER REFERENCES weighings(id) NOT NULL,
    vehicle_id INTEGER REFERENCES vehicles(id) NOT NULL,
    disposal_factory_id INTEGER REFERENCES disposal_factories(id) NOT NULL,
    planned_path JSONB NOT NULL,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    distance_km DECIMAL(10, 2),
    status route_status DEFAULT 'planning',
    deviation_count INTEGER DEFAULT 0,
    max_deviation_meters DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 车辆轨迹点表
-- ============================================================

CREATE TABLE IF NOT EXISTS vehicle_tracks (
    id BIGSERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES routes(id) NOT NULL,
    vehicle_id INTEGER REFERENCES vehicles(id) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    speed_kmh DECIMAL(6, 2),
    heading DECIMAL(5, 2),
    is_deviated BOOLEAN DEFAULT FALSE,
    deviation_distance_meters DECIMAL(10, 2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 处置证明 / 入库记录表
-- ============================================================

CREATE TABLE IF NOT EXISTS disposal_proofs (
    id SERIAL PRIMARY KEY,
    proof_no VARCHAR(50) UNIQUE NOT NULL,
    weighing_id INTEGER REFERENCES weighings(id) NOT NULL,
    route_id INTEGER REFERENCES routes(id) NOT NULL,
    disposal_factory_id INTEGER REFERENCES disposal_factories(id) NOT NULL,
    vehicle_id INTEGER REFERENCES vehicles(id) NOT NULL,
    received_weight_kg DECIMAL(10, 2) NOT NULL,
    weight_diff_kg DECIMAL(10, 2),
    weight_diff_percent DECIMAL(5, 2),
    receive_time TIMESTAMP WITH TIME ZONE NOT NULL,
    received_by INTEGER REFERENCES users(id),
    photo_urls TEXT[],
    status disposal_status DEFAULT 'pending',
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 异常清单表
-- ============================================================

CREATE TABLE IF NOT EXISTS exceptions (
    id SERIAL PRIMARY KEY,
    exception_no VARCHAR(50) UNIQUE NOT NULL,
    type exception_type NOT NULL,
    related_type VARCHAR(50),
    related_id INTEGER,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity INTEGER DEFAULT 1,
    status exception_status DEFAULT 'open',
    handled_by INTEGER REFERENCES users(id),
    handled_at TIMESTAMP WITH TIME ZONE,
    handle_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 结算记录表
-- ============================================================

CREATE TABLE IF NOT EXISTS settlements (
    id SERIAL PRIMARY KEY,
    settlement_no VARCHAR(50) UNIQUE NOT NULL,
    store_id INTEGER REFERENCES stores(id) NOT NULL,
    weighing_id INTEGER REFERENCES weighings(id) NOT NULL,
    weight_kg DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 4) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    status settlement_status DEFAULT 'pending',
    is_frozen BOOLEAN DEFAULT FALSE,
    frozen_reason VARCHAR(500),
    paid_at TIMESTAMP WITH TIME ZONE,
    paid_by INTEGER REFERENCES users(id),
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 系统参数配置表
-- ============================================================

CREATE TABLE IF NOT EXISTS sys_params (
    id SERIAL PRIMARY KEY,
    param_key VARCHAR(100) UNIQUE NOT NULL,
    param_value VARCHAR(500) NOT NULL,
    param_name VARCHAR(200) NOT NULL,
    description TEXT,
    data_type VARCHAR(20) DEFAULT 'string',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_appointments_store_id ON appointments(store_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vehicle_id ON appointments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_time ON appointments(appointment_time);

CREATE INDEX IF NOT EXISTS idx_weighings_appointment_id ON weighings(appointment_id);
CREATE INDEX IF NOT EXISTS idx_weighings_store_id ON weighings(store_id);
CREATE INDEX IF NOT EXISTS idx_weighings_status ON weighings(status);
CREATE INDEX IF NOT EXISTS idx_weighings_created_at ON weighings(created_at);

CREATE INDEX IF NOT EXISTS idx_routes_weighing_id ON routes(weighing_id);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle_id ON routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);

CREATE INDEX IF NOT EXISTS idx_vehicle_tracks_route_id ON vehicle_tracks(route_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_tracks_recorded_at ON vehicle_tracks(recorded_at);

CREATE INDEX IF NOT EXISTS idx_disposal_proofs_weighing_id ON disposal_proofs(weighing_id);
CREATE INDEX IF NOT EXISTS idx_disposal_proofs_status ON disposal_proofs(status);

CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exceptions(status);
CREATE INDEX IF NOT EXISTS idx_exceptions_type ON exceptions(type);
CREATE INDEX IF NOT EXISTS idx_exceptions_created_at ON exceptions(created_at);

CREATE INDEX IF NOT EXISTS idx_settlements_store_id ON settlements(store_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);

-- ============================================================
-- 插入默认系统参数
-- ============================================================

INSERT INTO sys_params (param_key, param_value, param_name, description, data_type) VALUES
('weight_diff_threshold', '5.0', '称重差异阈值(%)', '门店申报与实际称重差异超过此百分比触发异常', 'number'),
('route_deviation_threshold', '200', '路线偏离阈值(米)', '车辆偏离规划路线超过此距离触发异常', 'number'),
('oil_unit_price', '2.50', '废油回收单价(元/kg)', '餐厨废油回收结算单价', 'number'),
('transport_timeout_minutes', '180', '运输超时时间(分钟)', '超过此时间未到达处置厂触发超时异常', 'number')
ON CONFLICT (param_key) DO NOTHING;

-- ============================================================
-- 插入默认用户 (密码均使用 bcrypt hash，值为 "admin123" / "store123" / "driver123" / "inspector123")
-- 这里使用占位，实际由后端初始化脚本生成正确的 bcrypt hash
-- ============================================================

INSERT INTO users (username, password_hash, real_name, phone, role) VALUES
('admin', '$2b$12$placeholder_admin_password_hash_please_replace', '系统管理员', '13800000000', 'admin'),
('store01', '$2b$12$placeholder_store_password_hash_please_replace', '示范门店', '13800000001', 'store'),
('driver01', '$2b$12$placeholder_driver_password_hash_please_replace', '张师傅', '13800000002', 'driver'),
('inspector01', '$2b$12$placeholder_inspector_password_hash_please_replace', '李监管', '13800000003', 'inspector')
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- 插入示例门店数据
-- ============================================================

INSERT INTO stores (store_code, store_name, address, longitude, latitude, contact_person, contact_phone, user_id) VALUES
('ST001', '阳光大酒店', '北京市朝阳区建国路88号', 116.4672000, 39.9085000, '王经理', '13800000101', 2),
('ST002', '幸福餐厅', '北京市朝阳区光华路12号', 116.4528000, 39.9137000, '刘店长', '13800000102', NULL),
('ST003', '老字号饭庄', '北京市东城区王府井大街201号', 116.4168000, 39.9147000, '赵老板', '13800000103', NULL),
('ST004', '美食城', '北京市海淀区中关村大街1号', 116.3160000, 39.9820000, '孙主管', '13800000104', NULL),
('ST005', '川香阁', '北京市西城区西单北大街120号', 116.3730000, 39.9103000, '周大厨', '13800000105', NULL)
ON CONFLICT (store_code) DO NOTHING;

-- ============================================================
-- 插入示例车辆数据
-- ============================================================

INSERT INTO vehicles (plate_number, vehicle_type, capacity_kg, driver_id, status, current_longitude, current_latitude) VALUES
('京A12345', '餐厨废油回收车', 5000, 3, 'idle', 116.4500000, 39.9200000),
('京B67890', '餐厨废油回收车', 3000, NULL, 'idle', 116.4300000, 39.9000000),
('京C11111', '小型回收车', 1500, NULL, 'idle', 116.4000000, 39.9400000)
ON CONFLICT (plate_number) DO NOTHING;

-- ============================================================
-- 插入示例处置厂
-- ============================================================

INSERT INTO disposal_factories (factory_code, factory_name, address, longitude, latitude, contact_person, contact_phone) VALUES
('DF001', '北京绿源废油处理有限公司', '北京市大兴区经济开发区金苑路18号', 116.4500000, 39.7300000, '吴厂长', '13800000201'),
('DF002', '中环环保处置中心', '北京市通州区中关村科技园通州园', 116.6700000, 39.8700000, '郑主任', '13800000202')
ON CONFLICT (factory_code) DO NOTHING;

-- ============================================================
-- 更新时间触发器
-- ============================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS stores_updated_at ON stores;
CREATE TRIGGER stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS vehicles_updated_at ON vehicles;
CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS disposal_factories_updated_at ON disposal_factories;
CREATE TRIGGER disposal_factories_updated_at BEFORE UPDATE ON disposal_factories FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS appointments_updated_at ON appointments;
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS weighings_updated_at ON weighings;
CREATE TRIGGER weighings_updated_at BEFORE UPDATE ON weighings FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS routes_updated_at ON routes;
CREATE TRIGGER routes_updated_at BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS disposal_proofs_updated_at ON disposal_proofs;
CREATE TRIGGER disposal_proofs_updated_at BEFORE UPDATE ON disposal_proofs FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS exceptions_updated_at ON exceptions;
CREATE TRIGGER exceptions_updated_at BEFORE UPDATE ON exceptions FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS settlements_updated_at ON settlements;
CREATE TRIGGER settlements_updated_at BEFORE UPDATE ON settlements FOR EACH ROW EXECUTE FUNCTION update_timestamp();
