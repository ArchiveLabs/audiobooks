# audiobooks
Listen to millions of free books, read aloud by robot voices by your browser


## How to run

    $ git clone https://github.com/ArchiveLabs/audiobooks.git
    $ cd audiobooks
    $ python -m SimpleHTTPServer

## How it works

Consider `adventuresofbobw00burg` - The Autobiography of Benjamin Franklin (public domain)

Step 1:
- fetch the manifest (the book structural metdata) from our APIs: https://api.archivelab.org/books/adventuresofbobw00burg/ia_manifest

Step 2:
- Identify the 1st page from the manifest, i.e. the field `titleIndex` (from Step 1)

Step 3:
- Retrieve the plaintext for this page.*In this case, our metadata itself is imperfect, which is why we should use AI or mechanical turk to determine the 1st page*. The actual 1st page of the book content should be leaf 35: https://api.archivelab.org/books/adventuresofbobw00burg/pages/35/plaintext

Step 4:
- Have the browser synthesize this text to speech
