-- Add admin access policies for profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin access policies for generations
CREATE POLICY "Admins can view all generations" 
ON public.generations 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all generations" 
ON public.generations 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete generations" 
ON public.generations 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin access policies for transactions
CREATE POLICY "Admins can view all transactions" 
ON public.transactions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create transactions for any user" 
ON public.transactions 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add admin access policies for user_roles
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add admin access policies for agents
CREATE POLICY "Admins can view all agents" 
ON public.agents 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all agents" 
ON public.agents 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete agents" 
ON public.agents 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin access for achievements management
CREATE POLICY "Admins can manage achievements" 
ON public.achievements 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));