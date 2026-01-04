import styles from "./styles.module.css";
import { useState, useEffect } from "react";

export default function Hud ({ children, slideIn }) {
    const [hasAnimated, setHasAnimated] = useState(false);
    
    // Once slideIn triggers, mark as animated so it stays visible
    useEffect(() => {
        if (slideIn) {
            setHasAnimated(true);
        }
    }, [slideIn]);
    
    // Start hidden, then slideIn, then stay visible
    const className = `${styles.hud} ${slideIn ? styles.slideIn : ''} ${!hasAnimated ? styles.hudHidden : ''}`;
    
    return (
        <div className={className}>
            {children}
        </div>
    )
}