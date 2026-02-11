import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { User, Mail, Phone, MapPin, Save, LogOut } from 'lucide-react';
import { notify, Logger } from '../utils/cn';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Usuario {
  id?: number;
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
  cargo?: string;
  rol?: string;
  fechaCreacion?: string;
}

export default function PerfilPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    cargo: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    cargarUsuario();
  }, []);

  const cargarUsuario = async () => {
    try {
      setIsLoading(true);
      // Por ahora, obtener el primer usuario disponible
      // En un sistema real, esto vendría de la sesión actual
      const usuarios = await window.electronAPI?.getAllUsuarios() || [];
      
      if (usuarios.length > 0) {
        const usuarioActual = usuarios[0];
        setUsuario(usuarioActual);
        setFormData({
          nombre: usuarioActual.nombre || '',
          email: usuarioActual.email || '',
          telefono: usuarioActual.telefono || '',
          direccion: usuarioActual.direccion || '',
          cargo: usuarioActual.rol || 'Administrador',
        });
      } else {
        // Si no hay usuarios, crear uno por defecto
        const usuarioDefault: Usuario = {
          nombre: 'Usuario',
          email: 'usuario@resortespm.cl',
          telefono: '',
          direccion: '',
          cargo: 'Administrador',
          rol: 'Administrador',
        };
        setUsuario(usuarioDefault);
        setFormData({
          nombre: usuarioDefault.nombre,
          email: usuarioDefault.email,
          telefono: usuarioDefault.telefono || '',
          direccion: usuarioDefault.direccion || '',
          cargo: usuarioDefault.cargo || 'Administrador',
        });
      }
    } catch (error: any) {
      Logger.error('Error cargando usuario:', error);
      notify.error('Error', 'No se pudo cargar la información del usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!usuario) return;

    if (!formData.nombre || !formData.email) {
      notify.error('Error', 'El nombre y el email son obligatorios');
      return;
    }

    setIsLoading(true);
    try {
      const usuarioActualizado: Usuario = {
        ...usuario,
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono,
        direccion: formData.direccion,
        rol: formData.cargo,
      };

      const result = await window.electronAPI?.saveUsuario(usuarioActualizado);
      if (result && !result.success) {
        throw new Error(result.error || 'Error al guardar');
      }
      
      setUsuario(usuarioActualizado);
      setIsEditing(false);
      notify.success('Perfil actualizado', 'Los cambios se han guardado correctamente');
    } catch (error: any) {
      Logger.error('Error guardando usuario:', error);
      notify.error('Error', 'No se pudo guardar la información del usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      notify.error('Error', 'Debe completar todos los campos de contraseña');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      notify.error('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      notify.error('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      if (!usuario) return;

      const usuarioActualizado: Usuario = {
        ...usuario,
        // En un sistema real, aquí se debería hashear la contraseña
        // Por ahora, solo guardamos el texto plano (NO RECOMENDADO PARA PRODUCCIÓN)
      };

      const result = await window.electronAPI?.saveUsuario(usuarioActualizado);
      if (result && !result.success) {
        throw new Error(result.error || 'Error al guardar');
      }
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      notify.success('Contraseña actualizada', 'La contraseña se ha cambiado correctamente');
    } catch (error: any) {
      Logger.error('Error cambiando contraseña:', error);
      notify.error('Error', 'No se pudo cambiar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      notify.info('Cerrando sesión...', 'Redirigiendo al inicio de sesión');
      // En un sistema real, aquí se limpiaría la sesión y se redirigiría al login
      // window.location.href = '/login';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatearFecha = (fecha?: string) => {
    if (!fecha) return 'N/A';
    try {
      return format(new Date(fecha), 'MMMM yyyy', { locale: es });
    } catch {
      return fecha;
    }
  };

  if (isLoading && !usuario) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando información del perfil...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona tu información personal y configuración
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Editar Perfil
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Información Personal */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>
              Actualiza tu información de contacto y datos personales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre Completo *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  disabled={!isEditing || isLoading}
                  className="pl-9"
                  placeholder="Ingrese su nombre completo"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing || isLoading}
                  className="pl-9"
                  placeholder="usuario@ejemplo.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  disabled={!isEditing || isLoading}
                  className="pl-9"
                  placeholder="+56 9 1234 5678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  disabled={!isEditing || isLoading}
                  className="pl-9"
                  placeholder="Dirección completa"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                disabled={!isEditing || isLoading}
                placeholder="Ej: Administrador, Técnico, etc."
              />
            </div>
          </CardContent>
        </Card>

        {/* Avatar y Resumen */}
        <Card>
          <CardHeader>
            <CardTitle>Foto de Perfil</CardTitle>
            <CardDescription>
              Tu foto de perfil visible en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src="" alt={formData.nombre} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-semibold">
                  {getInitials(formData.nombre || 'Usuario')}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <Button variant="outline" size="sm" disabled>
                  Cambiar Foto
                </Button>
              )}
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Miembro desde</span>
                <span className="font-medium">
                  {usuario?.fechaCreacion ? formatearFecha(usuario.fechaCreacion) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Último acceso</span>
                <span className="font-medium">Hoy</span>
              </div>
              {usuario?.rol && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rol</span>
                  <span className="font-medium">{usuario.rol}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuración de Seguridad */}
      <Card>
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
          <CardDescription>
            Gestiona tu contraseña y configuración de seguridad
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Contraseña Actual</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              placeholder="Ingresa tu contraseña actual"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva Contraseña</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="Ingresa tu nueva contraseña (mínimo 6 caracteres)"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              placeholder="Confirma tu nueva contraseña"
              disabled={isLoading}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleChangePassword}
            disabled={isLoading || !passwordData.newPassword || !passwordData.confirmPassword}
          >
            {isLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
