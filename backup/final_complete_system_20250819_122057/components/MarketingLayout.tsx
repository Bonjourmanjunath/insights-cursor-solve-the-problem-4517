import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface MarketingLayoutProps {
  children: React.ReactNode;
}

const MarketingLayout = ({ children }: MarketingLayoutProps) => {
  const location = useLocation();

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-[60]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg"></div>
              <span className="text-xl font-bold text-foreground">FMR Global Health</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname === item.href
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild className="pointer-events-auto">
                <Link to="/auth" className="pointer-events-auto">Sign In</Link>
              </Button>
              <Button asChild className="pointer-events-auto">
                <Link to="/auth" className="pointer-events-auto">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-muted border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-primary rounded"></div>
                <span className="font-bold text-foreground">FMR Global Health</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Transforming healthcare market research with AI-powered insights and analytics.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/features" className="text-muted-foreground hover:text-primary">Features</Link></li>
                <li><Link to="/pricing" className="text-muted-foreground hover:text-primary">Pricing</Link></li>
                <li><Link to="/auth" className="text-muted-foreground hover:text-primary">Free Trial</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="text-muted-foreground hover:text-primary">About Us</Link></li>
                <li><Link to="/contact" className="text-muted-foreground hover:text-primary">Contact</Link></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary">Careers</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-primary">Privacy Policy</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary">Terms of Service</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 FMR Global Health. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingLayout;