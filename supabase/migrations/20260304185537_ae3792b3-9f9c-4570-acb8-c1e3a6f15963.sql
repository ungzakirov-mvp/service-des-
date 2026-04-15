
UPDATE pricing_plans SET extra_features = '["Удалённая и выездная поддержка", "IT Support", "Сетевые работы"]'::jsonb WHERE plan_key = 'micro';
UPDATE pricing_plans SET extra_features = '["Приоритетная поддержка", "IT Support", "Сетевые работы", "Видеонаблюдение"]'::jsonb WHERE plan_key = 'start';
UPDATE pricing_plans SET extra_features = '["Приоритетный выезд", "IT Support", "Сетевые работы", "Серверы", "Видеонаблюдение", "IP-телефония", "IT аудит"]'::jsonb WHERE plan_key = 'business';
UPDATE pricing_plans SET extra_features = '["Максимальный приоритет", "IT Support", "Сетевые работы", "Серверы", "Видеонаблюдение", "IP-телефония", "IT аудит"]'::jsonb WHERE plan_key = 'enterprise';
UPDATE pricing_plans SET extra_features = '["Инженер постоянно в офисе", "Полный контроль IT", "IT Support", "Сетевые работы", "Серверы", "Видеонаблюдение", "IP-телефония", "IT аудит"]'::jsonb WHERE plan_key = 'pro';
