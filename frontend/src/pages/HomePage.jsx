import { Link } from "react-router-dom";
import { ROUTES } from "../constants/routes";

const HomePage = () => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
    <div className="text-center max-w-lg animate-fade-in">
      <h1 className="text-[52px] font-black text-white tracking-tight leading-none mb-4">
        FITOS
      </h1>
      <p className="text-zinc-500 text-[15px] mb-10">
        Fitness coaching platform for trainers and clients.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
        <Link to={ROUTES.LOGIN}>
          <button className="h-11 px-7 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 active:scale-[0.97] transition-all duration-150">
            Get started
          </button>
        </Link>
        <Link to={ROUTES.DESIGN_SYSTEM}>
          <button className="h-11 px-7 rounded-xl bg-transparent border border-[#2a2a2a] text-white text-sm font-medium hover:bg-white/[0.04] hover:border-[#3a3a3a] active:scale-[0.97] transition-all duration-150">
            Design system →
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        {[
          { label: "Admin Portal",   to: ROUTES.ADMIN   },
          { label: "Trainer Portal", to: ROUTES.TRAINER },
          { label: "Client Portal",  to: ROUTES.CLIENT  },
        ].map(({ label, to }) => (
          <Link
            key={to}
            to={to}
            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-4 text-zinc-500 hover:text-white hover:border-[#2a2a2a] hover:bg-[#111] transition-all duration-150 text-[13px] font-medium"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  </div>
);

export default HomePage;
