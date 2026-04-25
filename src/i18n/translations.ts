/**
 * Mobile i18n translations — Spanish (Dominican Republic).
 * Subset of es-DO.json covering the mobile application surfaces.
 *
 * Usage:
 *   import { t } from '@/src/i18n/translations';
 *   const label = t('errors.no_autorizado');
 */

const translations: Record<string, string> = {
  // Authentication
  'errors.no_autorizado': 'No autorizado',
  'errors.sesion_sin_usuario': 'La sesión actual no incluye un identificador de usuario válido.',
  'errors.inicio_sesion_fallido': 'Inicio de sesión fallido',
  'errors.actualizacion_sesion_fallida': 'Actualización de sesión fallida',
  'errors.demasiadas_solicitudes': 'Demasiadas solicitudes',
  'errors.rate_limit_login': 'Has excedido temporalmente los intentos de inicio de sesión. Intenta de nuevo en unos minutos.',
  'errors.error_restablecer_contrasena': 'Error al restablecer contraseña',

  // Care requests
  'errors.solicitud_no_encontrada': 'Solicitud no encontrada',
  'errors.solicitud_no_encontrada_detalle': 'No se encontró la solicitud.',
  'errors.transicion_invalida': 'Transición inválida',
  'errors.cliente_invalido': 'Cliente inválido',
  'errors.cliente_invalido_detalle': 'Debes seleccionar un cliente activo y válido para crear la solicitud.',

  // Payroll
  'errors.periodo_no_encontrado': 'Período no encontrado',
  'errors.datos_invalidos': 'Datos inválidos',
  'errors.periodo_cerrado': 'Período cerrado',
  'errors.sin_identidad': 'Sin identidad',
  'errors.sin_identidad_detalle': 'No se pudo determinar el usuario enfermera.',
  'errors.periodo_zip_no_encontrado_detalle': 'No se encontraron datos de nómina para el período especificado.',

  // Common UI labels
  'labels.cargando': 'Cargando...',
  'labels.guardar': 'Guardar',
  'labels.cancelar': 'Cancelar',
  'labels.volver': 'Volver',
  'labels.error': 'Error',
  'labels.solicitud': 'Solicitud',
  'labels.solicitudes': 'Solicitudes',
  'labels.solicitudes_de_cuidado': 'Solicitudes de Cuidado',
  'labels.nueva_solicitud': 'Nueva Solicitud',
  'labels.crear_solicitud': 'Crear Solicitud',
  'labels.mis_solicitudes': 'Mis Solicitudes',
  'labels.detalle_solicitud': 'Detalle de Solicitud',
  'labels.nomina': 'Nómina',
  'labels.mi_nomina': 'Mi Nómina',
  'labels.periodo': 'Período',
  'labels.periodos': 'Períodos',
  'labels.estado': 'Estado',
  'labels.enfermera': 'Enfermera',
  'labels.cliente': 'Cliente',
  'labels.administrador': 'Administrador',
  'labels.usuarios': 'Usuarios',
  'labels.configuracion': 'Configuración',
  'labels.inicio': 'Inicio',
  'labels.perfil': 'Perfil',
  'labels.correo': 'Correo Electrónico',
  'labels.contrasena': 'Contraseña',
  'labels.confirmar_contrasena': 'Confirmar Contraseña',
  'labels.nombre': 'Nombre',
  'labels.apellido': 'Apellido',
  'labels.telefono': 'Teléfono',
  'labels.direccion': 'Dirección',
  'labels.cedula': 'Número de Cédula',

  // Status labels
  'statuses.pendiente': 'Pendiente',
  'statuses.aprobada': 'Aprobada',
  'statuses.completada': 'Completada',
  'statuses.rechazada': 'Rechazada',
  'statuses.cancelada': 'Cancelada',
  'statuses.abierto': 'Abierto',
  'statuses.cerrado': 'Cerrado',
  'statuses.activo': 'Activo',
  'statuses.inactivo': 'Inactivo',
  'statuses.facturada': 'Facturada',
  'statuses.pagada': 'Pagada',
  'statuses.anulada': 'Anulada',

  // Button actions
  'actions.iniciar_sesion': 'Iniciar Sesión',
  'actions.entrar': 'Entrar',
  'actions.cerrar_sesion': 'Cerrar Sesión',
  'actions.registrarse': 'Registrarse',
  'actions.enviar': 'Enviar',
  'actions.guardar': 'Guardar',
  'actions.cancelar': 'Cancelar',
  'actions.volver': 'Volver',
  'actions.confirmar': 'Confirmar',
  'actions.rechazar': 'Rechazar',
  'actions.aprobar': 'Aprobar',
  'actions.completar': 'Completar',
  'actions.aceptar': 'Aceptar',
  'actions.editar': 'Editar',
  'actions.eliminar': 'Eliminar',
  'actions.continuar': 'Continuar',
  'actions.siguiente': 'Siguiente',
  'actions.atras': 'Atrás',

  // Auth screen strings
  'auth.bienvenido': 'Bienvenido de nuevo',
  'auth.olvidaste_contrasena': '¿Olvidaste tu contraseña?',
  'auth.continuar_google': 'Continuar con Google',
  'auth.correo_obligatorio': 'El correo es obligatorio',
  'auth.correo_formato_invalido': 'El formato del correo no es válido',
  'auth.contrasena_obligatoria': 'La contraseña es obligatoria',

  // Messages
  'messages.sin_datos': 'Sin datos disponibles',
  'messages.cargando': 'Cargando...',
  'messages.error_generico': 'Ocurrió un error. Intenta de nuevo.',
  'messages.exito': 'Operación realizada correctamente.',
};

/**
 * Returns the translated string for the given key.
 * Falls back to the key itself if no translation is registered.
 */
export function t(key: string): string {
  return translations[key] ?? key;
}

export default translations;
