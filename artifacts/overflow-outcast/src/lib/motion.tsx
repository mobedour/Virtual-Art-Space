import { ReactNode } from "react";
import { motion, Variants, HTMLMotionProps } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 44 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.93 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.65, ease: EASE } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.08 } },
};

export const staggerFast: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

type ScrollProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
} & Omit<HTMLMotionProps<"div">, "variants" | "initial" | "whileInView" | "viewport" | "animate" | "children" | "className">;

function makeScrollFade(variants: Variants) {
  return function Comp({ children, className, delay = 0, once = true, ...rest }: ScrollProps) {
    const v: Variants = {
      hidden: variants.hidden,
      visible: {
        ...(variants.visible as object),
        transition: {
          ...((variants.visible as { transition?: object }).transition ?? {}),
          delay: delay / 1000,
        },
      },
    };
    return (
      <motion.div
        variants={v}
        initial="hidden"
        whileInView="visible"
        viewport={{ once, margin: "-80px" }}
        className={className}
        {...rest}
      >
        {children}
      </motion.div>
    );
  };
}

export const FadeUp = makeScrollFade(fadeUp);
export const FadeIn = makeScrollFade(fadeIn);
export const FadeDown = makeScrollFade(fadeDown);
export const ScaleIn = makeScrollFade(scaleIn);

export function Stagger({
  children,
  className,
  once = true,
  fast = false,
}: {
  children: ReactNode;
  className?: string;
  once?: boolean;
  fast?: boolean;
}) {
  return (
    <motion.div
      variants={fast ? staggerFast : staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-60px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

export function PageEnter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function HeroWord({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 56, rotateX: -12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.85, ease: EASE, delay }}
      style={{ display: "inline-block", transformOrigin: "bottom center" }}
    >
      {children}
    </motion.span>
  );
}

export { motion };
