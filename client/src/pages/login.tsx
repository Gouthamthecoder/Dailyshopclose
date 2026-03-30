import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Loader2, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  shopId: z.string().min(1, "Shop ID is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  shopId: z.string().min(1, "Shop ID is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(4, "Password must be at least 4 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function LoginPage() {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("login");
  const [loginValues, setLoginValues] = useState<LoginValues>({
    shopId: "",
    username: "",
    password: "",
  });
  const [registerValues, setRegisterValues] = useState<RegisterValues>({
    shopId: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setLoginError(null);
      const values = loginSchema.parse(loginValues);
      await login.mutateAsync(values);
    } catch (err: any) {
      const message = err?.issues?.[0]?.message ?? err.message;
      setLoginError(message);
      toast({ title: "Login failed", description: message, variant: "destructive" });
    }
  };

  const onRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setRegisterError(null);
      const values = registerSchema.parse(registerValues);
      await register.mutateAsync({ shopId: values.shopId, username: values.username, password: values.password });
      toast({ title: "Account created", description: "You've been logged in with daily closing access" });
    } catch (err: any) {
      const message = err?.issues?.[0]?.message ?? err.message;
      setRegisterError(message);
      toast({ title: "Registration failed", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-md bg-primary text-primary-foreground mx-auto">
            <Store className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-semibold" data-testid="text-login-title">ShopClose</h1>
          <p className="text-sm text-muted-foreground">Daily Sales Tracker</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <CardTitle className="text-lg">Welcome back</CardTitle>
                <CardDescription>Enter your credentials to access your shop</CardDescription>
              </TabsContent>
              <TabsContent value="register" className="mt-4">
                <CardTitle className="text-lg">Create account</CardTitle>
                <CardDescription>New accounts can access only the Daily Closing page</CardDescription>
              </TabsContent>
            </Tabs>
          </CardHeader>
          <CardContent>
            {tab === "login" ? (
                <form onSubmit={onLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="login-shop-id">Shop ID</label>
                    <Input
                      id="login-shop-id"
                      placeholder="shop-1"
                      value={loginValues.shopId}
                      onChange={(event) => setLoginValues((current) => ({ ...current, shopId: event.target.value }))}
                      autoComplete="organization"
                      data-testid="input-login-shop-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="login-username">Username</label>
                    <Input
                      id="login-username"
                      placeholder="Enter username"
                      value={loginValues.username}
                      onChange={(event) => setLoginValues((current) => ({ ...current, username: event.target.value }))}
                      autoComplete="username"
                      data-testid="input-login-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="login-password">Password</label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter password"
                      value={loginValues.password}
                      onChange={(event) => setLoginValues((current) => ({ ...current, password: event.target.value }))}
                      autoComplete="current-password"
                      data-testid="input-login-password"
                    />
                  </div>
                  {loginError ? <p className="text-sm font-medium text-destructive">{loginError}</p> : null}
                  <Button type="submit" className="w-full" disabled={login.isPending} data-testid="button-login">
                    {login.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                    Login
                  </Button>
                </form>
            ) : (
                <form onSubmit={onRegister} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="register-shop-id">Shop ID</label>
                    <Input
                      id="register-shop-id"
                      placeholder="shop-1"
                      value={registerValues.shopId}
                      onChange={(event) => setRegisterValues((current) => ({ ...current, shopId: event.target.value }))}
                      autoComplete="organization"
                      data-testid="input-register-shop-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="register-username">Username</label>
                    <Input
                      id="register-username"
                      placeholder="Choose a username"
                      value={registerValues.username}
                      onChange={(event) => setRegisterValues((current) => ({ ...current, username: event.target.value }))}
                      autoComplete="username"
                      data-testid="input-register-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="register-password">Password</label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Choose a password"
                      value={registerValues.password}
                      onChange={(event) => setRegisterValues((current) => ({ ...current, password: event.target.value }))}
                      autoComplete="new-password"
                      data-testid="input-register-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="register-confirm-password">Confirm Password</label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={registerValues.confirmPassword}
                      onChange={(event) => setRegisterValues((current) => ({ ...current, confirmPassword: event.target.value }))}
                      autoComplete="new-password"
                      data-testid="input-register-confirm"
                    />
                  </div>
                  {registerError ? <p className="text-sm font-medium text-destructive">{registerError}</p> : null}
                  <Button type="submit" className="w-full" disabled={register.isPending} data-testid="button-register">
                    {register.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    Create Account
                  </Button>
                </form>
            )}
          </CardContent>
        </Card>

      <p className="text-xs text-center text-muted-foreground">
          Default admin: shop-1 / admin / admin123. New users get daily closing access only within their own shop.
        </p>
      </div>
    </div>
  );
}
