import { motion } from "framer-motion";

const PulsingBrain = () => {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <motion.svg
        width="600"
        height="600"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="opacity-[0.06]"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.06, 0.1, 0.06],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Brain outline */}
        <path
          d="M100 30c-8 0-15 3-20 8-3-3-7-5-12-5-10 0-18 8-18 18 0 2 0 4 1 6-7 4-12 12-12 21 0 8 4 15 10 19-2 4-3 8-3 13 0 12 8 22 19 25 2 10 10 18 20 20v15h30v-15c10-2 18-10 20-20 11-3 19-13 19-25 0-5-1-9-3-13 6-4 10-11 10-19 0-9-5-17-12-21 1-2 1-4 1-6 0-10-8-18-18-18-5 0-9 2-12 5-5-5-12-8-20-8z"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Brain center line */}
        <path
          d="M100 38v127"
          stroke="hsl(var(--primary))"
          strokeWidth="0.8"
          strokeDasharray="3 3"
          opacity="0.6"
        />
        {/* Left hemisphere folds */}
        <path
          d="M95 55c-15 5-25 15-28 28M90 75c-10 3-18 12-22 22M88 100c-8 5-14 14-16 24M92 120c-5 4-10 12-12 20"
          stroke="hsl(var(--primary))"
          strokeWidth="0.8"
          fill="none"
          opacity="0.5"
        />
        {/* Right hemisphere folds */}
        <path
          d="M105 55c15 5 25 15 28 28M110 75c10 3 18 12 22 22M112 100c8 5 14 14 16 24M108 120c5 4 10 12 12 20"
          stroke="hsl(var(--primary))"
          strokeWidth="0.8"
          fill="none"
          opacity="0.5"
        />
        {/* Neural connection dots */}
        {[
          [70, 60], [55, 80], [50, 105], [60, 130], [75, 148],
          [130, 60], [145, 80], [150, 105], [140, 130], [125, 148],
          [85, 45], [115, 45], [100, 70], [80, 95], [120, 95],
        ].map(([cx, cy], i) => (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r="1.5"
            fill="hsl(var(--primary))"
            animate={{
              opacity: [0.3, 0.8, 0.3],
              r: [1.5, 2.2, 1.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.svg>
    </div>
  );
};

export default PulsingBrain;
