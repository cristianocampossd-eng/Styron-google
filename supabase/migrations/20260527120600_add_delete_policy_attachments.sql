-- Create a policy to allow authenticated users to delete attachments of their service orders
CREATE POLICY "Users can delete attachments of their OS"
  ON public.service_order_attachments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
      AND (so.created_by = auth.uid() OR so.assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
