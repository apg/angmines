/* state/value constants */
var MINE = 9;
var UNEXPLORED = 10;
var MARKED = 11;
var CHEAT = 12;

var LOSE = -1;
var WIN = 1;

var MAX_WIDTH = 20;
var MAX_HEIGHT = 20;
var MIN_WIDTH = 1;
var MIN_HEIGHT = 1;

/* Lookup table to compute neighborhood */
var NEIGHBORHOOD = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1], [0, 1], [1, 1],
];

var app = angular.module('mines', []);

var MinesCtrl = function($scope) {
    $scope.gameIsDone = 0;
    $scope.numMines = 10;
    $scope.width = 8;
    $scope.height = 8;

    $scope.gameIsDone = 0; // WIN, LOSE, or 0

    /* We store mine locations as a set of nested objects.
       If there's a mine at 1, 1 and 2, 0, then then mines looks
       like:

        { 1: { 1: 1 },
          2: { 0: 1 } }

       This allows us to "query" mine locations without iterating
       over all the cells and checking `value`
    */
    $scope.mines = undefined;
    
    /* Board state. Each cell is stored with an `id` in the DOM,
       it's `value` in the game, it's current `state`, and it's
       displayable `content`.

       * State: 0-8 represent the number of mines around the cell. 
         State 9 is the MINE state. State 10, 11, and 12 refer to
         UNEXPLORED, MARKED, SHOWCHEAT

         States are primarily used for applying CSS classes, though
         they are also utilized in the game engine.

       * Value: 0-9, where 9 is MINE, and 0-8 represent neighbor 
         count of MINES 
    */
    $scope.state = undefined; 


    $scope.reset = function() {
        $scope.gameIsDone = 0;
        $scope.state = newBoard($scope.width, $scope.height);
        $scope.mines = fillMines($scope.numMines, $scope.width, $scope.height);
        $scope.fillValues();
    }

    $scope.getCell = function(x, y) {
        if ($scope.state[y] && $scope.state[y][x]) {
            return $scope.state[y][x];
        }
        return;
    }

    $scope.getCellFromEvent = function(e) {
        var bits = e.currentTarget.id.split('-');
        var x = parseInt(bits[1]);
        var y = parseInt(bits[2]);
        var cell = $scope.state[y][x];
        return [cell, x, y];
    }

    $scope.hasMine = function(x, y) {
        return $scope.mines[y] && $scope.mines[y][x];
    }

    $scope.countNeighboringMines = function(x, y) {
        var n = 0;
        for (var i = 0; i < NEIGHBORHOOD.length; i++) {
            if ($scope.hasMine(NEIGHBORHOOD[i][0] + x, NEIGHBORHOOD[i][1] + y)) {
                n++;
            }
        }

        return n;
    };

    $scope.fillValues = function() {
        for (var y = 0; y < $scope.height; y++) {
            for (var x = 0; x < $scope.width; x++) {
                var cell = $scope.getCell(x, y);
                if ($scope.hasMine(x, y)) {
                    cell.value = MINE;
                }
                else {
                    cell.value = $scope.countNeighboringMines(x, y);
                }
            }
        }
    };

    $scope.expandAt = function(x, y) {
        var cell = $scope.getCell(x, y);
        /* If the cell at `x, y` is unexplored, "explore it" by 
           revealing it's neighboring mine count, and compute it's
           neighbors iff it's mine count is 0.

           In either case, update the content, cause we're now going
           to show the cell, unless it's a mine. But, you shouldn't
           be calling expandAt on a mine anyway....
        */
           
        if (cell && cell.state == UNEXPLORED && !$scope.hasMine(x, y)) {
            cell.state = cell.value;
            cell.content = contentForState(cell.state);

            if (cell.value == 0) {
                var neighbors = []
                for (var i = 0; i < NEIGHBORHOOD.length; i++) {
                    var nx = x + NEIGHBORHOOD[i][0];
                    var ny = y + NEIGHBORHOOD[i][1];
                    if (nx >= 0 && nx <= $scope.width &&
                        ny >= 0 && ny <= $scope.height) {
                        neighbors.push([nx, ny]);
                    }
                }
                return neighbors;
            }
        }
        return;
    };

    /* Reveals the game board */
    $scope.gameOver = function() {
        for (var y = 0; y < $scope.height; y++) {
            for (var x = 0; x < $scope.width; x++) {
                var cell = $scope.getCell(x, y);
                cell.state = cell.value;
                cell.content = contentForState(cell.state);
            }
        }
    };

    $scope.handleReset = function() {
        $scope.reset();
    };

    $scope.handleSettings = function() {
        $scope.width = parseInt($scope.width);
        $scope.height = parseInt($scope.height);
        $scope.numMines = parseInt($scope.numMines);

        if ($scope.width >= MIN_WIDTH && $scope.height >= MIN_HEIGHT) {
            $scope.width = Math.min($scope.width, MAX_WIDTH);
            $scope.height = Math.min($scope.height, MAX_HEIGHT);
        }
        else {
            $scope.width = Math.max($scope.width, MIN_WIDTH);
            $scope.height = Math.max($scope.height, MIN_HEIGHT);
        }

        if ($scope.numMines > 0) {
            $scope.numMines = Math.min($scope.numMines, ($scope.width * $scope.height) - 1);
        }
        else {
            $scope.numMines = 1;
        }
        $scope.reset();
    };

    $scope.handleClick = function($event) {
        var info = $scope.getCellFromEvent($event);
        var cell = info[0];
        var x = info[1];
        var y = info[2];
        
        if (cell.state == UNEXPLORED) {
            if ($scope.hasMine(x, y)) {
                $scope.gameOver();
                $scope.gameIsDone = LOSE;
            }
            else {
                /* Breadth first search for unexplored neighbors with
                   0 neighboring mines */
                var leftToDo = [[x, y]]
                var expanded = {}
                do {
                    var e = leftToDo.shift();
                    var neighbors = $scope.expandAt(e[0], e[1]);
                    if (neighbors) {
                        for (var i = 0; i < neighbors.length; i++) {
                            if (!expanded[neighbors[i].toString()]) {
                                leftToDo.push(neighbors[i]);
                            }
                        }
                    }
                    expanded[e.toString()] = 1;
                } while (leftToDo.length);
            }
        }
    };

    $scope.handleCheck = function($event) {
        for (var y = 0; y < $scope.height; y++) {
            for (var x = 0; x < $scope.width; x++) {
                var cell = $scope.getCell(x, y);
                if (cell.state == MARKED && !$scope.hasMine(x, y)) {
                    $scope.gameOver();
                    $scope.gameIsDone = LOSE;
                    return;
                }
                else if ($scope.hasMine(x, y) && cell.state != MARKED) {
                    $scope.gameOver();
                    $scope.gameIsDone = LOSE;
                    return;
                }
            }
        }
        $scope.gameIsDone = WIN;
    };

    $scope.handleCheat = function($event) {
        for (var y in $scope.mines) {
            for (var x in $scope.mines[y]) {
                var cell = $scope.getCell(x, y);
                if (cell) {
                    if (cell.state == UNEXPLORED) {
                        cell.state = CHEAT;
                    }
                    else if (cell.state == CHEAT) {
                        cell.state = UNEXPLORED;
                    }
                }
                
            }
        }
        for (var i = 0; i < $scope.mines.length; i++) {
            
        }
    }

    $scope.handleRightClick = function($event) {
        var info = $scope.getCellFromEvent($event);
        var cell = info[0];
        if (cell.state == MARKED) {
            cell.state = UNEXPLORED;
        }
        else {
            cell.state = MARKED;
        }
    };

    // Setup a new game
    $scope.reset();
};

var newBoard = function(w, h) {
    var rows = [];

    for (var y = 0; y < h; y++) {
        rows[y] = [];
        for (x = 0; x < w; x++) {
            rows[y].push({ id: 'cell-' + x + '-' + y,
                           value: undefined,
                           state: UNEXPLORED,
                           content: undefined });
        }
    }

    return rows;
}


var fillMines = function(n, w, h) {
    var mines = {}

    for (var i = 0; i < n; i++) {
        var ok = 0;
        var y;
        var x;
        while (!ok) {
            y = Math.floor(Math.random(h) * h);
            x = Math.floor(Math.random(w) * w);

            ok = !(mines[y] && mines[y][x]);
        }
        if (!(mines[y])) {
            mines[y] = {}
        }
        mines[y][x] = 1;
    }
    return mines;
};

var contentForState = function(s) {
    if (s < MINE && s > 0) {
        return '' + s;
    }
    else if (s == MINE) {
        return 'M';
    }
    return '';
}


app.directive('ngRightClick', function($parse) {
    return function(scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function(event) {
            scope.$apply(function() {
                event.preventDefault();
                fn(scope, {$event:event});
            });
        });
    };
});
