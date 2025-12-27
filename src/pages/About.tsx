import { Layout } from "@/components/Layout";
import { Mail } from "lucide-react";

export default function About() {
  return (
    <Layout>
      <div className="container py-12 md:py-20 max-w-2xl animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6">
          About
        </h1>

        <div className="space-y-6 text-muted-foreground">
          <p className="text-lg">
            Welcome to ZetsuServ Blog — a space for technical writing, 
            tutorials, and thoughts on software development.
          </p>

          <p>
            This blog is maintained by Ismail, covering topics ranging from 
            web development and system architecture to programming best 
            practices and emerging technologies.
          </p>

          <p>
            The goal is simple: share knowledge, document learnings, and 
            contribute to the developer community with clear, well-researched 
            content.
          </p>

          <div className="pt-6 border-t border-border">
            <h2 className="text-foreground font-medium mb-3">Get in touch</h2>
            <a 
              href="mailto:zetsuserv@gmail.com"
              className="inline-flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors"
            >
              <Mail className="h-4 w-4" />
              zetsuserv@gmail.com
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
