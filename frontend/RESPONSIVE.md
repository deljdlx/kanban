# Système de Responsive Design

## 📱 Breakpoints Définis

| Nom | Plage | Cas d'usage |
|-----|-------|-----------|
| **Mobile** | 0px - 639px | Téléphones, petits appareils |
| **Tablet** | 640px - 1023px | Tablettes, petits laptops |
| **Desktop** | 1024px - 1439px | Écrans standard |
| **Wide** | 1440px+ | Très grands écrans |

## 🛠️ Utilisation des Mixins

### Mixins Media Queries

```scss
// Mobile uniquement (max-width: 639px)
@include mobile { ... }

// Tablet uniquement (640px - 1023px)
@include tablet { ... }

// Tablet et plus grand (640px+)
@include tablet-up { ... }

// Desktop uniquement (1024px - 1439px)
@include desktop { ... }

// Desktop et plus grand (1024px+)
@include desktop-up { ... }

// Grand écran (1440px+)
@include wide { ... }

// Portrait orientation
@include portrait { ... }

// Landscape orientation
@include landscape { ... }
```

## 📝 Exemples Pratiques

### Exemple 1 : Largeur de Colonne

```scss
.column {
    width: 100%;
    
    @include tablet-up {
        width: 280px;
    }
    
    @include desktop-up {
        width: 300px;
    }
}
```

### Exemple 2 : Direction Flexbox

```scss
.board {
    display: flex;
    flex-direction: column; // mobile: vertical
    
    @include tablet-up {
        flex-direction: row; // tablet+: horizontal
    }
}
```

### Exemple 3 : Padding Adaptatif

```scss
.header {
    padding: var(--spacing-md);
    
    @include tablet-up {
        padding: var(--spacing-md) var(--spacing-lg);
    }
}
```

### Exemple 4 : Typo Responsive

```scss
.title {
    font-size: 0.9rem; // mobile
    
    @include tablet-up {
        font-size: 1.1rem;
    }
}
```

## 🎯 Composants Déjà Adaptés

✅ `.board` - Colonne sur mobile, ligne sur tablet+
✅ `.column` - 100% sur mobile, 280px/300px sur tablet+
✅ `.app-header` - Flex-wrap sur mobile, horizontal sur tablet+
✅ `.modal` - Responsive avec margins et max-width adaptatif

## 📚 Mixins Utilitaires

### flex-responsive

```scss
@include flex-responsive(column, row);
// = flex-direction: column sur mobile, row sur desktop+
```

### text-responsive

```scss
@include text-responsive(0.85rem, 0.95rem);
// = font-size: 0.85rem mobile, 0.95rem tablet+
```

### padding-responsive

```scss
@include padding-responsive(var(--spacing-md), var(--spacing-lg));
// = padding: var(--spacing-md) mobile, var(--spacing-lg) tablet+
```

## 🚀 Bonnes Pratiques

1. **Mobile-first** : Toujours définir le style pour mobile en premier
2. **Utiliser les variables** : Préférer `var(--spacing-*)` aux valeurs brutes
3. **Cohérence** : Respecter les 4 breakpoints standard
4. **Tests** : Tester sur les dimensions clés (320px, 640px, 1024px, 1440px)

## ❌ À Éviter

```scss
// ❌ Magic numbers
@media (max-width: 768px) { ... }

// ❌ Trop de breakpoints
@media (min-width: 412px) { ... }
@media (min-width: 823px) { ... }

// ❌ Pas de mobile-first
@media (min-width: 1024px) { ... } // seulement du desktop
```

## ✅ À Faire

```scss
// ✅ Utiliser les mixins
@include tablet-up { ... }

// ✅ Mobile-first
.element {
    // styles mobile par défaut
    
    @include tablet-up {
        // overrides tablet+
    }
}

// ✅ Cohérent avec les breakpoints
@include desktop-up {
    width: 300px;
}
```
