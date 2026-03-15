import { motion } from "framer-motion";
import logoImg from "@/assets/logo.png";

const PulsingBrain = () => {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <motion.img
        src={logoImg}
        alt=""
        className="h-[400px] w-[400px] object-contain opacity-[0.07] sm:h-[500px] sm:w-[500px]"
        style={{ filter: "brightness(2) grayscale(0.3)" }}
        animate={{
          scale: [1, 1.06, 1],
          opacity: [0.07, 0.12, 0.07],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

export default PulsingBrain;
