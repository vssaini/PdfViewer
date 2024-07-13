'use strict';

var fileName;

var pdfDoc,
    pageNum,
    pageRendering,
    pageNumPending,
    scale,
    zoomRange,
    canvas,
    ctx;

var reportPreview = function () {

    function init(downloadByUrl, url) {

        console.log(`Report Preview initialized.`);

        initializeDefaults(url);
        configurePdfToolbarClickHandlers();

        if (downloadByUrl) {
            showPdfInPreviewer(url);
        } else {
            fetchPdf(url);
        }
    }

    function initializeDefaults() {
        pdfDoc = null,
            pageNum = 1,
            pageRendering = false,
            pageNumPending = null,
            scale = 1.5,
            zoomRange = 0.25,
            canvas = document.getElementById('the-canvas'),
            ctx = canvas.getContext('2d');
    }

    function configurePdfToolbarClickHandlers() {

        $('#prev').on('click', onPrevPage);
        $('#next').on('click', onNextPage);
        $('#zoomin').on('click', onZoomIn);
        $('#zoomout').on('click', onZoomOut);
        $('#zoomfit').on('click', onZoomFit);
    }

    /**
    * Fetch PDF bytes from the server.
    */
    function fetchPdf(url) {

        console.log(`PDF bytes will be fetched using URL - ${url}`);

        // Ref - https://stackoverflow.com/a/45529553/1041457
        fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'blob',
                'Content-Type': 'application/json; charset=UTF-8'
            }
            //body: JSON.stringify(params)
        })
            .then(showDownloadErrorIfAny)
            .then(getBlobPdfUrl)
            .then(showPdfInPreviewer)
            .catch(error => {
                const errorMsg = `An error occurred while fetching PDF file. Error - ${error.message}`;
                console.error(errorMsg);
                showMessage(errorMsg, 'error');
            });
    }

    function getFilenameFromHeader(response) {
        const contentDispositionHeader = response.headers.get('Content-Disposition');
        var filename = '';
        if (contentDispositionHeader && contentDispositionHeader.indexOf('attachment') !== -1) {
            const filenameMatch = contentDispositionHeader.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, '');
            }
        }
        return filename;
    }

    function showDownloadErrorIfAny(response) {

        const contentType = response.headers.get('content-type');

        // If response is JSON, then it's definitely error message
        if (contentType && contentType.indexOf('application/json') !== -1) {
            return response.json().then(data => {
                // The response was a JSON object
                // Process your data as a JavaScript object                            
                throw Error(data.ErrorMessage);
            });
        }

        fileName = getFilenameFromHeader(response);

        return response.blob();
    }

    /**
    * Get BLOB PDF url from file.
    */
    function getBlobPdfUrl(file) {

        const blob = new Blob([file], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);

        return blobUrl;
    }

    /**
    * Show BLOB url in pdfJS previewer.
    */
    function showPdfInPreviewer(url) {

        console.log(`Showing PDF from URL '${url}' in pdfJS previewer.`);

        pdfjsLib.getDocument(url).promise.then(function (pdfResponse) {
            pdfDoc = pdfResponse;
            document.getElementById('page_count').textContent = `/ ${pdfDoc.numPages}`;

            $('#page_num').on('change', function () {
                const pageNumber = Number($(this).val());
                if (pageNumber > 0 && pageNumber <= pdfDoc.numPages) {
                    queueRenderPage(pageNumber);
                }
            });

            // Initial/first page rendering
            renderPage(pageNum);
        });
    }

    /**
     * Get page info from document, resize canvas accordingly, and render page.
     * @@param num Page number.
     */
    function renderPage(num) {
        pageRendering = true;
        // Using promise to fetch the page
        pdfDoc.getPage(num).then(function (page) {
            const viewport = page.getViewport({ scale: scale });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Render PDF page into canvas context
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };

            const renderTask = page.render(renderContext);

            // Wait for rendering to finish
            renderTask.promise.then(function () {
                pageRendering = false;
                if (pageNumPending !== null) {
                    // New page rendering is pending
                    renderPage(pageNumPending);
                    pageNumPending = null;
                }
            });
        });

        // Update page counters
        document.getElementById('page_num').value = num;
    }

    /**
     * If another page rendering in progress, waits until the rendering is
     * finished. Otherwise, executes rendering immediately.
     */
    function queueRenderPage(num) {
        if (pageRendering) {
            pageNumPending = num;
        } else {
            renderPage(num);
        }
    }

    /**
     * Displays previous page.
     */
    function onPrevPage() {
        if (pageNum <= 1) {
            return;
        }
        pageNum--;
        queueRenderPage(pageNum);
    }

    /**
     * Displays next page.
     */
    function onNextPage() {
        if (pageNum >= pdfDoc.numPages) {
            return;
        }
        pageNum++;
        queueRenderPage(pageNum);
    }

    /**
     * Zoom in page.
     */
    function onZoomIn() {
        scale += zoomRange;
        queueRenderPage(pageNum);
    }

    /**
     * Zoom out page.
     */
    function onZoomOut() {
        if (scale <= zoomRange) {
            return;
        }
        scale -= zoomRange;
        queueRenderPage(pageNum);
    }

    /**
     * Zoom fit page.
     */
    function onZoomFit() {
        scale = 1;
        queueRenderPage(pageNum);
    }

    return {
        init: init
    }
}();