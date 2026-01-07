# ImagePanZoom

ImagePanZoom - это легковесная библиотека для реализации функциональности панорамирования и масштабирования изображений в браузере. Библиотека предоставляет плавное управление с помощью мыши, клавиатуры и сенсорных устройств с поддержкой инерции и ограничений границ.

## Особенности

- Плавное масштабирование с помощью колеса мыши
- Перетаскивание для панорамирования
- Двойной клик для увеличения
- Вращение содержимого
- Поддержка инерции (плавное продолжение движения после перетаскивания)
- Ограничение границ (предотвращает уход содержимого за пределы видимой области)
- Настраиваемые параметры масштабирования и анимации
- Легковесная реализация без внешних зависимостей

## Установка

```bash
npm install zoomer
```

## Использование

### Базовое использование

```javascript
import { createImagePanZoom } from 'zoomer';

// Создание экземпляра
const container = document.getElementById('container');
const content = document.getElementById('content');

const panZoom = createImagePanZoom(container, content);
```

### HTML структура

```html
<div id="container" style="width: 500px; height: 500px;">
  <img id="content" src="image.jpg" alt="Zoomable image" style="max-width: none;">
</div>
```

## Опции

При инициализации можно передать объект опций:

```javascript
const panZoom = createImagePanZoom(container, content, {
  minScale: 0.5,        // Минимальный масштаб
  maxScale: 3,          // Максимальный масштаб
  initialScale: 1,      // Начальный масштаб
  wheelZoomSpeed: 0.0015, // Скорость масштабирования колесом мыши
  boundsPadding: 0.1,   // Отступ от границ при ограничении
  friction: 0.92,       // Коэффициент трения для инерции
  maxSpeed: 300         // Максимальная скорость инерции
});
```

## API

### Методы

#### `reset()`
Сбрасывает трансформацию к начальному состоянию.

```javascript
panZoom.reset();
```

#### `rotate(deg)`
Поворачивает содержимое на заданное количество градусов.

```javascript
panZoom.rotate(90); // Поворот на 90 градусов
```

#### `getTransform()`
Возвращает текущее состояние трансформации.

```javascript
const transform = panZoom.getTransform();
console.log(transform); // { scale: 1.5, x: 10, y: -5, rotation: 0 }
```

#### `setTransform(transform)`
Устанавливает состояние трансформации.

```javascript
panZoom.setTransform({
  scale: 2,
  x: 50,
  y: 30
});
```

#### `destroy()`
Уничтожает экземпляр и удаляет все обработчики событий.

```javascript
panZoom.destroy();
```

## Интерфейсы

### `ImagePanZoomOptions`
```typescript
interface ImagePanZoomOptions {
  minScale?: number;        // Минимальный масштаб
  maxScale?: number;        // Максимальный масштаб
  initialScale?: number;    // Начальный масштаб
  wheelZoomSpeed?: number;  // Скорость масштабирования колесом мыши
  boundsPadding?: number;   // Отступ от границ при ограничении
  friction?: number;        // Коэффициент трения для инерции
  maxSpeed?: number;        // Максимальная скорость инерции
}
```

### `Transform`
```typescript
interface Transform {
  scale: number;    // Текущий масштаб
  x: number;        // Смещение по оси X
  y: number;        // Смещение по оси Y
  rotation: number; // Угол поворота в градусах
}
```

## Примеры

### Полный пример с настройками

```html
<!DOCTYPE html>
<html>
<head>
  <title>ImagePanZoom Example</title>
  <style>
    #container {
      width: 500px;
      height: 500px;
      border: 1px solid #ccc;
      margin: 20px;
    }
    #content {
      max-width: none;
    }
  </style>
</head>
<body>
  <div id="container">
    <img id="content" src="example.jpg" alt="Zoomable image">
  </div>

  <script type="module">
    import { createImagePanZoom } from 'zoomer';

    const container = document.getElementById('container');
    const content = document.getElementById('content');

    const panZoom = createImagePanZoom(container, content, {
      minScale: 0.5,
      maxScale: 5,
      initialScale: 1,
      wheelZoomSpeed: 0.002
    });

    // Добавляем кнопки управления
    const buttonContainer = document.createElement('div');
    
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Сбросить';
    resetBtn.onclick = () => panZoom.reset();
    
    const rotateBtn = document.createElement('button');
    rotateBtn.textContent = 'Повернуть на 90°';
    rotateBtn.onclick = () => panZoom.rotate(90);
    
    buttonContainer.appendChild(resetBtn);
    buttonContainer.appendChild(rotateBtn);
    document.body.appendChild(buttonContainer);
  </script>
</body>
</html>
```

## Поддерживаемые действия

- **Масштабирование**: Прокрутка колеса мыши для увеличения/уменьшения
- **Панорамирование**: Перетаскивание содержимого левой кнопкой мыши
- **Двойной клик**: Быстрое увеличение в точке клика
- **Инерция**: Плавное продолжение движения после перетаскивания
- **Ограничения**: Предотвращение ухода содержимого за границы контейнера

## Совместимость

Библиотека использует современные API браузера и протестирована в последних версиях Chrome, Firefox, Safari и Edge.

## Лицензия

MIT License