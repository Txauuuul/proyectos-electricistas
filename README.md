# Portal de Electricistas

Aplicación web para que los electricistas registren proyectos, suban planos, añadan marcadores, y captured fotos del sitio.

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js (v16 o superior)
- MongoDB (local o MongoDB Atlas)
- Git

### Instalación

1. **Clonar repositorio**
```bash
cd c:\Users\User\Prueba\proyectos-electricistas
```

2. **Instalar dependencias (ya hecho)**
```bash
cd frontend && npm install
cd ../backend && npm install
```

### Configuración de Base de Datos

El proyecto está configurado para usar MongoDB. Tienes dos opciones:

**Opción 1: MongoDB Local con Docker**
```powershell
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Opción 2: MongoDB Atlas (Cloud)**
1. Ve a https://www.mongodb.com/cloud/atlas
2. Crea una cuenta gratuita
3. Crea un cluster (M0 es gratuito)
4. Actualiza `backend/.env` con tu connection string:
```
MONGODB_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/electricistas
```

### Ejecutar la Aplicación

**Terminal 1 - Backend (Puerto 5000):**
```powershell
cd c:\Users\User\Prueba\proyectos-electricistas\backend
npm run dev
```

**Terminal 2 - Frontend (Puerto 5173):**
```powershell
cd c:\Users\User\Prueba\proyectos-electricistas\frontend
npm run dev
```

Una vez iniciados:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api

### Primeros Pasos

1. Abre http://localhost:5173 en tu navegador
2. Regístrate como "Electricista" o "Administrador"
3. Crea un nuevo proyecto desde el dashboard
4. Sigue los pasos (Información → Planos → Fotos → Completado)

## 📁 Estructura del Proyecto

```
proyectos-electricistas/
├── backend/
│   ├── models/              (Base de datos: User, Project)
│   ├── controllers/         (Lógica de negocio)
│   ├── routes/              (Endpoints API)
│   ├── middleware/          (Autenticación JWT)
│   ├── server.js            (Servidor principal)
│   └── .env                 (Variables de entorno)
│
├── frontend/
│   ├── src/
│   │   ├── pages/           (LoginPage, Dashboard, WizardPage)
│   │   ├── components/      (Componentes React)
│   │   │   ├── wizard/      (Step1, Step2, Step3, Step4)
│   │   │   └── canvas/      (Editor de planos con Fabric.js)
│   │   ├── context/         (AuthContext, ProjectContext)
│   │   ├── App.jsx          (Rutas principales)
│   │   └── main.jsx         (Punto de entrada)
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
│
└── README.md
```

## 🛠️ Stack Tecnológico

### Frontend
- **Vite** - Bundler rápido
- **React** - UI Library
- **React Router** - Navegación
- **Tailwind CSS** - Estilos
- **Fabric.js** - Canvas interactivo
- **PDF.js** - Renderizado de PDFs
- **React Hook Form** - Validación de formularios

### Backend
- **Node.js + Express** - Servidor web
- **MongoDB** - Base de datos
- **JWT** - Autenticación
- **Bcrypt** - Hashing de contraseñas

## 🔐 Autenticación

El sistema usa JWT (JSON Web Tokens). Los roles disponibles son:
- **Electricista:** Crea y gestiona sus propios proyectos
- **Administrador:** Ve todos los proyectos de todos los usuarios

## 📚 Endpoints API Principales

### Autenticación
- `POST /api/auth/registrar` - Registrar nuevo usuario
- `POST /api/auth/login` - Login

### Proyectos
- `GET /api/proyectos` - Obtener proyectos (según rol)
- `GET /api/proyectos/:id` - Obtener proyecto específico
- `POST /api/proyectos` - Crear nuevo proyecto
- `PUT /api/proyectos/:id` - Actualizar proyecto
- `DELETE /api/proyectos/:id` - Eliminar proyecto

## 🎨 UI/UX

- **Diseño Responsive** - Optimizado para desktop, tablet y móvil
- **Idioma:** Neerlandés para textos de usuario
- **Tema:** Azul profesional con Tailwind CSS
- **Componentes intuitivos** - Wizard multi-paso, editor visual, galería de fotos

## ⚡ Características

✅ Autenticación con JWT  
✅ Multi-tenant (Electricistas + Administradores)  
✅ Wizard de 4 pasos para crear proyectos  
✅ Editor de planos con Fabric.js  
✅ Marcadores personalizables (Cámara, Wi-Fi, Árbol)  
✅ Dibujo a mano alzada en planos  
✅ Soporte para imágenes y PDFs  
✅ Galería de fotos del sitio  
✅ Panel de control para ver todos los proyectos  

## 🐛 Troubleshooting

**MongoDB no conecta:**
- Verifica que MongoDB esté corriendo: `docker ps`
- Si usas Atlas, revisa la connection string en `.env`

**Puerto 5000 o 5173 en uso:**
- Cambia el puerto en los archivos de configuración
- O detén el proceso que usa ese puerto: `netstat -ano | findstr :5000`

**Problema de CORS:**
- Asegúrate de que el frontend use la URL correcta en `VITE_API_URL`
- Revisa que el backend tenga CORS habilitado


