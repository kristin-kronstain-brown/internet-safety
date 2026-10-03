// Adds a print button to every game, every bingo card, and every answer key,
// so a parent can put one of them on one sheet instead of printing a whole
// lesson.
//
// Games and answer keys are separate sibling blocks in the markup, and the
// print rules hide .answers by default. A printed game therefore never carries
// its own answers, which is the point of keeping them apart.
//
// The buttons are injected rather than written into each markdown file, which
// keeps the content blocks free of anything but content.
(function () {
  var SELECTOR = '#article-content .game, #article-content .card-sheet, #article-content .answers';
  var targets = document.querySelectorAll(SELECTOR);
  if (!targets.length) return;

  function label(block) {
    if (block.classList.contains('card-sheet')) return 'Print this card';
    if (block.classList.contains('answers')) return 'Print answer key';
    return 'Print this game';
  }

  // Mark every ancestor up to #article-content, so the print rules can hide
  // the other children at each level without hiding the target itself. This is
  // what lets a single card print out of the middle of a game block.
  function openAncestors(block) {
    var marked = [];
    var node = block.parentElement;
    while (node) {
      marked.push(node);
      if (node.id === 'article-content') break;
      node = node.parentElement;
    }
    marked.forEach(function (n) { n.classList.add('print-keep-open'); });
    return marked;
  }

  function printBlock(block) {
    block.classList.add('printing');
    document.body.classList.add('print-one');
    var ancestors = openAncestors(block);

    // A collapsed <details> prints nothing but its summary, so open any inside
    // the block being printed, then put each one back as the reader left it.
    var wasClosed = [];
    block.querySelectorAll('details:not([open])').forEach(function (d) {
      wasClosed.push(d);
      d.open = true;
    });

    function cleanup() {
      document.body.classList.remove('print-one');
      block.classList.remove('printing');
      ancestors.forEach(function (n) { n.classList.remove('print-keep-open'); });
      wasClosed.forEach(function (d) { d.open = false; });
      window.removeEventListener('afterprint', cleanup);
    }

    window.addEventListener('afterprint', cleanup);
    window.print();

    // Safari does not reliably fire afterprint, so clear the state anyway.
    setTimeout(cleanup, 1000);
  }

  targets.forEach(function (block) {
    var btn = document.createElement('button');
    btn.className = 'print-btn';
    btn.type = 'button';
    btn.textContent = label(block);
    btn.addEventListener('click', function () {
      printBlock(block);
    });
    block.insertBefore(btn, block.firstChild);
  });
})();
