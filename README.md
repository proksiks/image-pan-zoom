# ImagePanZoom

ImagePanZoom - это легковесная библиотека для реализации функциональности панорамирования и масштабирования изображений в браузере. Библиотека предоставляет плавное управление с помощью мыши, клавиатуры и сенсорных устройств с поддержкой инерции и ограничений границ.

[Демо](https://proksiks.github.io/image-pan-zoom/)

## Особенности

- Плавное масштабирование с помощью колеса мыши
- Перетаскивание для панорамирования
- Двойной клик/тап для увеличения
- Вращение содержимого
- Поддержка инерции (плавное продолжение движения после перетаскивания)
- Ограничение границ (предотвращает уход содержимого за пределы видимой области)
- Поддержка жестов двумя пальцами (pinch zoom, поворот)
- Плавные анимации (transition)
- Настраиваемые параметры масштабирования и анимации
- Легковесная реализация без внешних зависимостей
- Полный контроль над трансформацией через API

## Установка

```bash
npm install image-pan-zoom
```

## Использование

### Базовое использование

```javascript
import { createImagePanZoom } from 'image-pan-zoom';

// Создание экземпляра
const container = document.getElementById('container');
const content = document.getElementById('content');

const panZoom = createImagePanZoom(container, content);
```

### HTML структура

```html
<div class="zoom-container" id="image-container">
  <div class="content" id="image-content">
    <img draggable="false" src="https://img.goodfon.ru/wallpaper/nbig/c/c9/enot-vzgliad-voda-pogruzhenie-morda.webp" alt="Zoomable image">
  </div>
</div>
```

## Опции

При инициализации можно передать объект опций:

```javascript
const panZoom = createImagePanZoom(container, content, {
  minScale: 0.1,        // Минимальный масштаб (default: 0.5)
  maxScale: 10,         // Максимальный масштаб (default: 3)
  initialScale: 1,      // Начальный масштаб (default: 1)
  wheelZoomSpeed: 0.0015, // Скорость масштабирования колесом мыши (default: 0.0015)
  boundsPadding: 0.1,   // Отступ от границ при ограничении (default: 0.1)
  friction: 0.92,       // Коэффициент трения для инерции (default: 0.92)
  maxSpeed: 300,        // Максимальная скорость инерции (default: 300)
  transition: true,     // Включить плавные анимации (default: false)
  pinchSpeed: 1,        // Скорость масштабирования жестом (default: 1)
  enableRotation: true, // Включить поворот жестом двумя пальцами (default: true)
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

#### `setTransform(transform, useTransition?)`
Устанавливает состояние трансформации.

```javascript
panZoom.setTransform({
  scale: 2,
  x: 50,
  y: 30,
  rotation: 45
});
```

#### `moveTo(targetX, targetY, useTransition?)`
Перемещает центр вида к указанным координатам контейнера.

```javascript
panZoom.moveTo(100, 100); // Переместить центр к точке (100, 100)
```

#### `moveBy(deltaX, deltaY, useTransition?)`
Перемещает вид на указанные дельты по осям.

```javascript
panZoom.moveBy(50, -30); // Переместить на 50px вправо и 30px вверх
```

#### `zoomTo(scale, pointX?, pointY?, useTransition?)`
Масштабирует к указанному значению scale в указанной точке.

```javascript
panZoom.zoomTo(2); // Масштабировать до 2x в центре
panZoom.zoomTo(2, 100, 100); // Масштабировать до 2x в точке (100, 100)
```

#### `centerOnImagePoint(imageX, imageY, useTransition?)`
Центрирует вид на указанной точке изображения.

```javascript
panZoom.centerOnImagePoint(300, 200); // Центрировать на точке изображения (300, 200)
```

#### `containerToImage(containerX, containerY)`
Конвертирует координаты контейнера в координаты изображения.

```javascript
const imageCoords = panZoom.containerToImage(100, 100);
console.log(imageCoords); // { x: 50, y: 75 }
```

#### `imageToContainer(imageX, imageY)`
Конвертирует координаты изображения в координаты контейнера.

```javascript
const containerCoords = panZoom.imageToContainer(50, 75);
console.log(containerCoords); // { x: 100, y: 100 }
```

#### `getViewportBounds()`
Возвращает границы текущего вьюпорта в координатах контейнера.

```javascript
const bounds = panZoom.getViewportBounds();
console.log(bounds); // { left: 10, top: 10, right: 10, bottom: 10 }
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
  transition?: boolean;     // Включить плавные анимации
  pinchSpeed?: number;      // Скорость масштабирования жестом
  enableRotation?: boolean; // Включить поворот жестом двумя пальцами
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
      overflow: hidden;
      position: relative;
    }
    #content {
      max-width: none;
      position: absolute;
      top: 50%;
      left: 50%;
      transform-origin: 50% 50%;
    }
  </style>
</head>
<body>
  <div id="container">
    <img id="content" src="example.jpg" alt="Zoomable image">
  </div>

  <script type="module">
    import { createImagePanZoom } from 'image-pan-zoom';

    const container = document.getElementById('container');
    const content = document.getElementById('content');

    const panZoom = createImagePanZoom(container, content, {
      minScale: 0.1,
      maxScale: 10,
      initialScale: 1,
      wheelZoomSpeed: 0.002,
      transition: true,
      pinchSpeed: 1
    });

    // Добавляем кнопки управления
    const buttonContainer = document.createElement('div');
    
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Сбросить';
    resetBtn.onclick = () => panZoom.reset();
    
    const rotateBtn = document.createElement('button');
    rotateBtn.textContent = 'Повернуть на 90°';
    rotateBtn.onclick = () => panZoom.rotate(90);
    
    const moveToBtn = document.createElement('button');
    moveToBtn.textContent = 'Переместить в (100, 100)';
    moveToBtn.onclick = () => panZoom.moveTo(100, 100);
    
    const zoomToBtn = document.createElement('button');
    zoomToBtn.textContent = 'Увеличить до 2x';
    zoomToBtn.onclick = () => panZoom.zoomTo(2);
    
    buttonContainer.appendChild(resetBtn);
    buttonContainer.appendChild(rotateBtn);
    buttonContainer.appendChild(moveToBtn);
    buttonContainer.appendChild(zoomToBtn);
    document.body.appendChild(buttonContainer);
  </script>
</body>
</html>
```

## Поддерживаемые действия

- **Масштабирование колесом**: Прокрутка колеса мыши для увеличения/уменьшения
- **Панорамирование**: Перетаскивание содержимого левой кнопкой мыши
- **Двойной клик/тап**: Быстрое увеличение в точке клика/касания
- **Инерция**: Плавное продолжение движения после перетаскивания
- **Ограничения**: Предотвращение ухода содержимого за границы контейнера
- **Жесты двумя пальцами**: Масштабирование, панорамирование и поворот на сенсорных устройствах
- **Поворот**: Программный поворот изображения
- **Точное позиционирование**: Перемещение к конкретным координатам

## Совместимость

Библиотека использует современные API браузера и протестирована в последних версиях Chrome, Firefox, Safari и Edge.

## Обновления в версии 1.0.0

- Добавлена поддержка жестов двумя пальцами (pinch zoom, поворот)
- Добавлены плавные анимации (transition)
- Добавлены новые методы для точного контроля:
  - `moveTo()` - перемещение к конкретным координатам
  - `moveBy()` - перемещение на указанные дельты
  - `zoomTo()` - масштабирование к указанному значению
  - `centerOnImagePoint()` - центрирование на точке изображения
  - `containerToImage()` и `imageToContainer()` - конвертация координат
  - `getViewportBounds()` - получение границ вьюпорта
- Добавлена обработка двойного тапа на сенсорных устройствах
- Улучшена производительность и устранены баги с дерганием при масштабировании
- Добавлена возможность поворота изображения жестом двумя пальцами

## Лицензия

MIT License