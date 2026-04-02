---
description: Guía de Diseño iOS y Human Interface Guidelines (HIG) para NursingCare Mobile
---

# Apple Human Interface Guidelines (HIG) for NursingCare Mobile

Este flujo define los estándares para crear una experiencia nativa premium en iOS usando React Native dentro del proyecto NursingCare.

## 1. Tactile Feedback (Haptics)
*   **Eventos de Éxito:** Siempre dispara `hapticFeedback.success()` cuando una acción crítica se complete (ej: login, envío de solicitud).
*   **Eventos de Error:** Dispara `hapticFeedback.error()` cuando una operación falle (errores de validación, errores de red).
*   **Micro-interacciones:** Usa `hapticFeedback.light()` para botones, switches y pequeños disparadores de navegación.

## 2. Safe Areas & Layout
*   **SafeAreaView:** Cada pantalla de nivel superior debe estar envuelta en un `SafeAreaView`. Esto evita que el contenido quede oculto por el "Notch" o el indicador de inicio.
*   **Espaciado:** Mantén un padding horizontal mínimo de `20px` y un espaciado vertical de al menos `16px` entre grupos de entrada.

## 3. Translucency & Depth (Glassmorphism)
*   **Jerarquía Visual:** Usa `BlurView` de `expo-blur` detrás de cabeceras flotantes para indicar que el contenido está en capas.
*   **Fondos:** Prefiere los fondos del sistema. Evita colores planos y marcados que carezcan de profundidad visual.

## 4. Typography & Accessibility
*   **Fuentes del Sistema:** Usa la pila de fuentes por defecto el sistema (`San Francisco` en iOS).
*   **Dynamic Type:** Usa tamaños de fuente flexibles que respondan a la configuración de accesibilidad del usuario.
*   **Touch Targets:** iOS requiere un área de toque mínima de `44x44` puntos para elementos interactivos.

## 5. Navigation Patterns
*   **Despido Interactivo:** Los modales deben poder cerrarse deslizando hacia abajo.
*   **Predecibilidad:** El botón de "Atrás" siempre debe estar en la esquina superior izquierda y debe indicar claramente a dónde está regresando el usuario.

---

> [!TIP]
> Prueba siempre tu interfaz tanto en un dispositivo con notch (iPhone 13/14/15) como en un dispositivo heredado (iPhone SE) para asegurar el equilibrio del layout.
