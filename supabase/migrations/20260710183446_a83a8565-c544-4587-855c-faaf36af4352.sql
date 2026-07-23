-- Add super_admin role and auto-grant to okbin8511@gmail.com
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
