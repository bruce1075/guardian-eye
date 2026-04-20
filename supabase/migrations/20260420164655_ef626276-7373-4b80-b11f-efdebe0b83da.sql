CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP POLICY IF EXISTS "Public read incident photos" ON storage.objects;
CREATE POLICY "Auth read incident photos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'incident-photos');