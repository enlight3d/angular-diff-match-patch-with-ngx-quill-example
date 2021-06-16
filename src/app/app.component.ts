import { Component } from '@angular/core';
import { diff_match_patch } from 'diff-match-patch';
@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  left: string;
  right: string;
  diffOutput: string = '';
  dmp: diff_match_patch;
  unicodeRangeStart = 0xe000;
  tagMap = {};
  mapLength = 0;

  ngOnInit(): void {
    var unicodeCharacter = String.fromCharCode(
      this.unicodeRangeStart + this.mapLength
    );
    this.tagMap['&nbsp;'] = unicodeCharacter;
    this.tagMap[unicodeCharacter] = '&nbsp;';
    this.mapLength++;
    this.dmp = new diff_match_patch();
    this.left =
      '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p><ol><li>One</li><li>Two</li></ol>';
    this.right =
      '<p>Lorem ipsum dolor sit amet, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id laborum.</p><ol><li>One</li><li>Two</li><li>Three</li></ol>';
  }

  clear(): void {
    this.diffOutput = '';
  }

  doDiff(): void {
    var diffableLeft = this.convertHtmlToDiffableString(this.left);
    console.log(diffableLeft);
    var diffableRight = this.convertHtmlToDiffableString(this.right);
    console.log(diffableRight);
    var diffs = this.dmp.diff_main(diffableLeft, diffableRight);
    console.log(diffs);
    this.dmp.diff_cleanupSemantic(diffs);
    var diffOutput = '';
    for (var x = 0; x < diffs.length; x++) {
      diffs[x][1] = this.insertTagsForOperation(diffs[x][1], diffs[x][0]);
      diffOutput += this.convertDiffableBackToHtml(diffs[x][1]);
    }
    this.diffOutput = diffOutput;
  }

  insertTagsForOperation(diffableString: string, operation: number): string {
    // Don't insert anything if these are all tags
    var n = -1;
    do {
      n++;
    } while (diffableString.charCodeAt(n) >= this.unicodeRangeStart + 1);
    if (n >= diffableString.length) {
      return diffableString;
    }
    var openTag = '';
    var closeTag = '';
    if (operation === 1) {
      openTag = '<ins>';
      closeTag = '</ins>';
    } else if (operation === -1) {
      openTag = '<del>';
      closeTag = '</del>';
    } else {
      return diffableString;
    }
    var outputString = openTag;
    var isOpen = true;
    for (var x = 0; x < diffableString.length; x++) {
      if (diffableString.charCodeAt(x) < this.unicodeRangeStart) {
        // We just hit a regular character. If tag is not open, open it.
        if (!isOpen) {
          outputString += openTag;
          isOpen = true;
        }
        // Always add regular characters to the output
        outputString += diffableString[x];
      } else {
        // We just hit one of our mapped unicode characters. Close our tag.
        if (isOpen) {
          outputString += closeTag;
          isOpen = false;
        }
        // If this is a delete operation, do not add the deleted tags
        // to the output
        if (operation === -1) {
          continue;
        } else {
          outputString += diffableString[x];
        }
      }
    }
    if (isOpen) outputString += closeTag;
    return outputString;
  }

  convertHtmlToDiffableString(htmlString: string): string {
    htmlString = htmlString.replace(/&nbsp;/g, this.tagMap['&nbsp;']);
    var diffableString = '';
    var offset = 0;
    while (offset < htmlString.length) {
      var tagStart = htmlString.indexOf('<', offset);
      if (tagStart < 0) {
        diffableString += htmlString.substr(offset);
        break;
      } else {
        var tagEnd = htmlString.indexOf('>', tagStart);
        if (tagEnd < 0) {
          // Invalid HTML
          // Truncate at the start of the tag
          console.log('Invalid HTML. String will be truncated.');
          diffableString += htmlString.substr(offset, tagStart - offset);
          break;
        }
        var tagString = htmlString.substr(tagStart, tagEnd + 1 - tagStart);
        // Is this tag already mapped?
        var unicodeCharacter = this.tagMap[tagString];
        if (unicodeCharacter === undefined) {
          // Nope, need to map it
          unicodeCharacter = String.fromCharCode(
            this.unicodeRangeStart + this.mapLength
          );
          this.tagMap[tagString] = unicodeCharacter;
          this.tagMap[unicodeCharacter] = tagString;
          this.mapLength++;
        }
        // At this point it has been mapped, so now we can use it
        diffableString += htmlString.substr(offset, tagStart - offset);
        diffableString += unicodeCharacter;
        offset = tagEnd + 1;
      }
    }
    return diffableString;
  }
  convertDiffableBackToHtml(diffableString): string {
    var htmlString = '';
    for (var x = 0; x < diffableString.length; x++) {
      var charCode = diffableString.charCodeAt(x);
      if (charCode < this.unicodeRangeStart) {
        htmlString += diffableString[x];
        continue;
      }
      var tagString = this.tagMap[diffableString[x]];
      if (tagString === undefined) {
        // We somehow have a character that is above our range but didn't map
        // Do we need to add an upper bound or change the range?
        htmlString += diffableString[x];
      } else {
        htmlString += tagString;
      }
    }
    return htmlString;
  }
}
